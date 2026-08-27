(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;

  function identity() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }

  function multiply(a, b) {
    const out = new Float32Array(16);
    for (let column = 0; column < 4; column += 1) {
      for (let row = 0; row < 4; row += 1) {
        out[column * 4 + row] =
          a[row] * b[column * 4] +
          a[4 + row] * b[column * 4 + 1] +
          a[8 + row] * b[column * 4 + 2] +
          a[12 + row] * b[column * 4 + 3];
      }
    }
    return out;
  }

  function translation(x, y, z) {
    const out = identity();
    out[12] = x;
    out[13] = y;
    out[14] = z;
    return out;
  }

  function scaling(x, y, z) {
    const out = identity();
    out[0] = x;
    out[5] = y;
    out[10] = z;
    return out;
  }

  function rotationX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
  }

  function rotationY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  }

  function rotationZ(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1]);
  }

  function compose(position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    let matrix = translation(position[0], position[1], position[2]);
    matrix = multiply(matrix, rotationY(rotation[1]));
    matrix = multiply(matrix, rotationX(rotation[0]));
    matrix = multiply(matrix, rotationZ(rotation[2]));
    return multiply(matrix, scaling(scale[0], scale[1], scale[2]));
  }

  function perspective(fieldOfView, aspect, near, far) {
    const f = 1 / Math.tan(fieldOfView / 2);
    const range = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * range, -1,
      0, 0, near * far * 2 * range, 0,
    ]);
  }

  function normalize(vector) {
    const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
    return [vector[0] / length, vector[1] / length, vector[2] / length];
  }

  function cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  function lookAt(eye, target, up) {
    const z = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
    const x = normalize(cross(up, z));
    const y = cross(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
      -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
      -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
      1,
    ]);
  }

  function hexColor(hex, alpha = 1) {
    const normalized = hex.replace("#", "");
    const value = normalized.length === 3
      ? parseInt(normalized.split("").map((character) => character + character).join(""), 16)
      : parseInt(normalized, 16);
    return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255, alpha];
  }

  function faceNormal(a, b, c) {
    return normalize(cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]));
  }

  class SpaceRenderer3D {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext("webgl", { antialias: true, alpha: false, powerPreference: "high-performance" });
      this.ready = Boolean(this.gl);
      this.time = 0;
      this.width = 480;
      this.height = 270;
      this.quality = "high";
      if (!this.ready) return;

      this.program = this.createProgram();
      this.locations = {
        position: this.gl.getAttribLocation(this.program, "aPosition"),
        normal: this.gl.getAttribLocation(this.program, "aNormal"),
        mvp: this.gl.getUniformLocation(this.program, "uMVP"),
        model: this.gl.getUniformLocation(this.program, "uModel"),
        color: this.gl.getUniformLocation(this.program, "uColor"),
        fog: this.gl.getUniformLocation(this.program, "uFog"),
        light: this.gl.getUniformLocation(this.program, "uLight"),
        emissive: this.gl.getUniformLocation(this.program, "uEmissive"),
        pointSize: this.gl.getUniformLocation(this.program, "uPointSize"),
      };
      this.meshes = this.createMeshes();
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.depthFunc(this.gl.LEQUAL);
      this.gl.enable(this.gl.CULL_FACE);
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }

    createShader(type, source) {
      const shader = this.gl.createShader(type);
      this.gl.shaderSource(shader, source);
      this.gl.compileShader(shader);
      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        throw new Error(this.gl.getShaderInfoLog(shader));
      }
      return shader;
    }

    createProgram() {
      const vertex = this.createShader(this.gl.VERTEX_SHADER, `
        attribute vec3 aPosition;
        attribute vec3 aNormal;
        uniform mat4 uMVP;
        uniform mat4 uModel;
        uniform vec4 uColor;
        uniform vec3 uLight;
        uniform float uEmissive;
        uniform float uPointSize;
        varying vec4 vColor;
        varying float vFog;
        void main() {
          vec3 normal = normalize(mat3(uModel) * aNormal);
          float diffuse = 0.42 + max(dot(normal, normalize(uLight)), 0.0) * 0.58;
          float lighting = mix(diffuse, 1.0, uEmissive);
          vColor = vec4(uColor.rgb * lighting, uColor.a);
          gl_Position = uMVP * vec4(aPosition, 1.0);
          gl_PointSize = uPointSize;
          vFog = smoothstep(14.0, 38.0, gl_Position.w);
        }
      `);
      const fragment = this.createShader(this.gl.FRAGMENT_SHADER, `
        precision mediump float;
        uniform vec3 uFog;
        varying vec4 vColor;
        varying float vFog;
        void main() {
          vec3 color = mix(vColor.rgb, uFog, vFog * 0.88);
          gl_FragColor = vec4(color, vColor.a);
        }
      `);
      const program = this.gl.createProgram();
      this.gl.attachShader(program, vertex);
      this.gl.attachShader(program, fragment);
      this.gl.linkProgram(program);
      if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        throw new Error(this.gl.getProgramInfoLog(program));
      }
      return program;
    }

    mesh(positions, normals, mode = this.gl.TRIANGLES) {
      const positionBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
      const normalBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normalBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);
      return { positionBuffer, normalBuffer, count: positions.length / 3, mode };
    }

    boxMesh() {
      const positions = [];
      const normals = [];
      const faces = [
        { n: [0, 0, 1], v: [[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]] },
        { n: [0, 0, -1], v: [[.5, -.5, -.5], [-.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5]] },
        { n: [1, 0, 0], v: [[.5, -.5, .5], [.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5]] },
        { n: [-1, 0, 0], v: [[-.5, -.5, -.5], [-.5, -.5, .5], [-.5, .5, .5], [-.5, .5, -.5]] },
        { n: [0, 1, 0], v: [[-.5, .5, .5], [.5, .5, .5], [.5, .5, -.5], [-.5, .5, -.5]] },
        { n: [0, -1, 0], v: [[-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5]] },
      ];
      for (const face of faces) {
        for (const index of [0, 1, 2, 0, 2, 3]) {
          positions.push(...face.v[index]);
          normals.push(...face.n);
        }
      }
      return this.mesh(positions, normals);
    }

    octaMesh() {
      const top = [0, .7, 0];
      const bottom = [0, -.7, 0];
      const ring = [[-.55, 0, 0], [0, 0, -.75], [.55, 0, 0], [0, 0, .75]];
      const positions = [];
      const normals = [];
      for (let i = 0; i < 4; i += 1) {
        const next = ring[(i + 1) % 4];
        for (const triangle of [[top, ring[i], next], [bottom, next, ring[i]]]) {
          const normal = faceNormal(...triangle);
          for (const vertex of triangle) {
            positions.push(...vertex);
            normals.push(...normal);
          }
        }
      }
      return this.mesh(positions, normals);
    }

    wedgeMesh() {
      const points = [
        [-.5, -.25, .55], [.5, -.25, .55], [0, -.18, -.7],
        [-.34, .25, .35], [.34, .25, .35], [0, .12, -.7],
      ];
      const triangles = [
        [0, 1, 2], [3, 5, 4], [0, 3, 4], [0, 4, 1],
        [1, 4, 5], [1, 5, 2], [2, 5, 3], [2, 3, 0], [0, 2, 1],
      ];
      const positions = [];
      const normals = [];
      for (const indices of triangles) {
        const triangle = indices.map((index) => points[index]);
        const normal = faceNormal(...triangle);
        for (const vertex of triangle) {
          positions.push(...vertex);
          normals.push(...normal);
        }
      }
      return this.mesh(positions, normals);
    }

    sphereMesh(segments = 16, rings = 10) {
      const positions = [];
      const normals = [];
      const vertex = (latitude, longitude) => {
        const phi = latitude * Math.PI - Math.PI / 2;
        const theta = longitude * TAU;
        return [Math.cos(phi) * Math.sin(theta), Math.sin(phi), Math.cos(phi) * Math.cos(theta)];
      };
      for (let y = 0; y < rings; y += 1) {
        for (let x = 0; x < segments; x += 1) {
          const a = vertex(y / rings, x / segments);
          const b = vertex((y + 1) / rings, x / segments);
          const c = vertex((y + 1) / rings, (x + 1) / segments);
          const d = vertex(y / rings, (x + 1) / segments);
          for (const point of [a, b, c, a, c, d]) {
            positions.push(...point);
            normals.push(...normalize(point));
          }
        }
      }
      return this.mesh(positions, normals);
    }

    torusMesh(segments = 24, sides = 6) {
      const positions = [];
      const normals = [];
      const vertex = (segment, side) => {
        const around = segment / segments * TAU;
        const tube = side / sides * TAU;
        const radius = 1 + Math.cos(tube) * .12;
        return {
          p: [Math.sin(around) * radius, Math.sin(tube) * .12, Math.cos(around) * radius],
          n: [Math.sin(around) * Math.cos(tube), Math.sin(tube), Math.cos(around) * Math.cos(tube)],
        };
      };
      for (let segment = 0; segment < segments; segment += 1) {
        for (let side = 0; side < sides; side += 1) {
          const a = vertex(segment, side);
          const b = vertex(segment + 1, side);
          const c = vertex(segment + 1, side + 1);
          const d = vertex(segment, side + 1);
          for (const point of [a, b, c, a, c, d]) {
            positions.push(...point.p);
            normals.push(...point.n);
          }
        }
      }
      return this.mesh(positions, normals);
    }

    gridMesh() {
      const positions = [];
      const normals = [];
      for (let x = -14; x <= 14; x += 1) {
        positions.push(x, 0, -22, x, 0, 12);
        normals.push(0, 1, 0, 0, 1, 0);
      }
      for (let z = -22; z <= 12; z += 1.5) {
        positions.push(-14, 0, z, 14, 0, z);
        normals.push(0, 1, 0, 0, 1, 0);
      }
      return this.mesh(positions, normals, this.gl.LINES);
    }

    starMesh() {
      const positions = [];
      const normals = [];
      let seed = 90210;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let i = 0; i < 260; i += 1) {
        positions.push((random() - .5) * 42, 1 + random() * 17, -31 + random() * 46);
        normals.push(0, 1, 0);
      }
      return this.mesh(positions, normals, this.gl.POINTS);
    }

    createMeshes() {
      return {
        box: this.boxMesh(),
        octa: this.octaMesh(),
        wedge: this.wedgeMesh(),
        sphere: this.sphereMesh(),
        torus: this.torusMesh(),
        grid: this.gridMesh(),
        stars: this.starMesh(),
      };
    }

    resize() {
      const bounds = this.canvas.getBoundingClientRect();
      const nativeRatio = Math.min(2, window.devicePixelRatio || 1);
      const pixelRatio = this.quality === "low" ? 0.7 : this.quality === "balanced" ? 1 : nativeRatio;
      const width = Math.max(1, Math.min(1920, Math.round(bounds.width * pixelRatio)));
      const height = Math.max(1, Math.min(1080, Math.round(bounds.height * pixelRatio)));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      this.gl.viewport(0, 0, width, height);
    }

  toWorld(x, y, height = 0) {
      return [(x - this.width / 2) / 21.5, height, (y - this.height * .52) / 13.3 - 2.65];
    }

    drawMesh(mesh, model, color, emissive = 0, pointSize = 2) {
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer);
      gl.enableVertexAttribArray(this.locations.position);
      gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
      gl.enableVertexAttribArray(this.locations.normal);
      gl.vertexAttribPointer(this.locations.normal, 3, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(this.locations.model, false, model);
      gl.uniformMatrix4fv(this.locations.mvp, false, multiply(this.viewProjection, model));
      gl.uniform4fv(this.locations.color, color);
      gl.uniform1f(this.locations.emissive, emissive);
      gl.uniform1f(this.locations.pointSize, pointSize);
      if (color[3] < .99) gl.depthMask(false);
      gl.drawArrays(mesh.mode, 0, mesh.count);
      if (color[3] < .99) gl.depthMask(true);
    }

    part(base, mesh, position, scale, color, rotation = [0, 0, 0], emissive = 0) {
      const local = compose(position, rotation, scale);
      this.drawMesh(mesh, multiply(base, local), typeof color === "string" ? hexColor(color) : color, emissive);
    }

    drawShip(player, colors, demo = false) {
      const position = demo
        ? [player.x, .4 + Math.sin(this.time * 1.4 + player.index) * .08, player.z]
        : this.toWorld(player.x, player.y, .32);
      const roll = demo ? Math.sin(this.time + player.index) * .12 : clamp(-player.vx * .006, -.34, .34);
      const pitch = demo ? -.08 : clamp(player.vy * .0018, -.12, .12);
      const frameId = player.frameId || "comet";
      const frameScale = frameId === "bulwark" ? 1.02 : frameId === "pulse" ? .9 : .92;
      const base = compose(position, [pitch, 0, roll], [frameScale, frameScale, frameScale]);
      const dark = colors.dark;
      const bright = colors.color;
      const light = colors.light;
      const flame = .25 + Math.sin(this.time * 28 + player.index) * .08;

      if (frameId === "bulwark") {
        this.part(base, this.meshes.box, [0, .02, .04], [1.45, .34, .92], dark);
        this.part(base, this.meshes.wedge, [0, .18, -.28], [.68, .5, 1.05], bright);
        this.part(base, this.meshes.box, [-1.03, 0, .14], [.62, .16, .7], bright, [0, -.08, 0]);
        this.part(base, this.meshes.box, [1.03, 0, .14], [.62, .16, .7], bright, [0, .08, 0]);
        this.part(base, this.meshes.box, [-1.24, .17, -.05], [.16, .23, .36], light, [0, 0, 0], .24);
        this.part(base, this.meshes.box, [1.24, .17, -.05], [.16, .23, .36], light, [0, 0, 0], .24);
        this.part(base, this.meshes.sphere, [0, .48, -.25], [.28, .18, .36], light, [0, 0, 0], .28);
        for (const engineX of [-.72, -.24, .24, .72]) {
          this.part(base, this.meshes.box, [engineX, -.06, .74], [.11, .12, .25], "#fff28a", [0, 0, 0], 1);
          this.part(base, this.meshes.octa, [engineX, -.06, 1.02], [.065, .065, flame * .78], bright, [Math.PI / 2, 0, 0], 1);
        }
      } else if (frameId === "pulse") {
        this.part(base, this.meshes.wedge, [0, .12, -.22], [.42, .48, 1.42], bright);
        this.part(base, this.meshes.wedge, [-.66, .02, .22], [.78, .13, .78], dark, [0, .42, -.04]);
        this.part(base, this.meshes.wedge, [.66, .02, .22], [.78, .13, .78], dark, [0, -.42, .04]);
        this.part(base, this.meshes.wedge, [-.45, .07, -.18], [.52, .16, .62], bright, [0, -.22, 0]);
        this.part(base, this.meshes.wedge, [.45, .07, -.18], [.52, .16, .62], bright, [0, .22, 0]);
        this.part(base, this.meshes.sphere, [0, .38, -.35], [.17, .12, .34], light, [0, 0, 0], .4);
        this.part(base, this.meshes.torus, [0, .04, .58], [.34, .16, .34], hexColor(light, .55), [Math.PI / 2, 0, this.time * 1.8], .8);
        this.part(base, this.meshes.box, [0, -.03, .7], [.13, .12, .28], "#fff28a", [0, 0, 0], 1);
        this.part(base, this.meshes.octa, [0, -.03, 1.02], [.09, .09, flame * 1.35], bright, [Math.PI / 2, 0, 0], 1);
      } else {
        this.part(base, this.meshes.wedge, [0, .08, -.05], [.55, .45, 1.05], bright);
        this.part(base, this.meshes.box, [-.48, -.02, .16], [.72, .09, .5], dark, [0, -.14, -.04]);
        this.part(base, this.meshes.box, [.48, -.02, .16], [.72, .09, .5], dark, [0, .14, .04]);
        this.part(base, this.meshes.wedge, [-.5, .02, -.04], [.55, .22, .55], bright, [0, .08, 0]);
        this.part(base, this.meshes.wedge, [.5, .02, -.04], [.55, .22, .55], bright, [0, -.08, 0]);
        this.part(base, this.meshes.sphere, [0, .3, -.12], [.2, .14, .3], light, [0, 0, 0], .25);
        this.part(base, this.meshes.box, [-.16, -.02, .68], [.1, .1, .22], "#fff28a", [0, 0, 0], 1);
        this.part(base, this.meshes.box, [.16, -.02, .68], [.1, .1, .22], "#fff28a", [0, 0, 0], 1);
        this.part(base, this.meshes.octa, [-.16, -.02, .9], [.07, .07, flame], bright, [Math.PI / 2, 0, 0], 1);
        this.part(base, this.meshes.octa, [.16, -.02, .9], [.07, .07, flame], bright, [Math.PI / 2, 0, 0], 1);
      }

      if (!demo && player.shield > 0) {
        this.part(base, this.meshes.sphere, [0, .05, 0], [1.05, .55, 1.08], hexColor("#86eaff", .17), [0, this.time, 0], 1);
      }
    }

    drawEnemy(enemy) {
      const position = this.toWorld(enemy.x, enemy.y, .32);
      const enemyScale = (enemy.elite ? 1.32 : 1) * (enemy.moduleScale || 1);
      const base = compose(position, [0, enemy.type === "spinner" ? enemy.age * 2 : 0, Math.sin(enemy.age * 2 + enemy.seed) * .05], [enemyScale, enemyScale, enemyScale]);
      if (enemy.boss) {
        this.drawBoss(enemy, base);
        return;
      }

      if (enemy.type === "scout") {
        this.part(base, this.meshes.octa, [0, .08, 0], [.48, .3, .7], "#8d6aff");
        this.part(base, this.meshes.wedge, [-.42, 0, .12], [.52, .18, .52], "#4e347f", [0, -.25, 0]);
        this.part(base, this.meshes.wedge, [.42, 0, .12], [.52, .18, .52], "#4e347f", [0, .25, 0]);
        this.part(base, this.meshes.sphere, [0, .24, -.1], [.13, .1, .18], "#ffdf68", [0, 0, 0], .7);
      } else if (enemy.type === "dart") {
        this.part(base, this.meshes.wedge, [0, .06, 0], [.48, .36, .9], "#ff755f");
        this.part(base, this.meshes.box, [0, -.02, .22], [1.2, .08, .34], "#79304e");
        this.part(base, this.meshes.sphere, [0, .22, -.15], [.12, .09, .18], "#ffd173", [0, 0, 0], .8);
      } else if (enemy.type === "tank") {
        this.part(base, this.meshes.box, [0, .02, .05], [1.25, .42, .9], "#ef565f");
        this.part(base, this.meshes.box, [0, .34, -.1], [.62, .24, .55], "#772d52");
        this.part(base, this.meshes.box, [-.28, .42, -.36], [.12, .12, .28], "#fff19a", [0, 0, 0], .7);
        this.part(base, this.meshes.box, [.28, .42, -.36], [.12, .12, .28], "#fff19a", [0, 0, 0], .7);
      } else if (enemy.type === "spinner") {
        this.part(base, this.meshes.box, [0, .06, 0], [1.35, .12, .25], "#9e78ff", [0, enemy.age * 2, 0]);
        this.part(base, this.meshes.box, [0, .06, 0], [.25, .12, 1.35], "#6f52c7", [0, enemy.age * 2, 0]);
        this.part(base, this.meshes.octa, [0, .18, 0], [.32, .32, .32], "#e0d3ff", [0, -enemy.age, 0], .4);
      } else {
        this.part(base, this.meshes.octa, [0, .06, 0], [.65, .5, .65], "#ff4f70", [0, enemy.age, 0]);
        this.part(base, this.meshes.sphere, [0, .08, 0], [.2, .2, .2], "#ffd46c", [0, 0, 0], 1);
        for (let i = 0; i < 4; i += 1) {
          const angle = i / 4 * TAU;
          this.part(base, this.meshes.box, [Math.sin(angle) * .62, .04, Math.cos(angle) * .62], [.09, .09, .42], "#972642", [0, angle, 0]);
        }
      }

      const moduleColor = enemy.moduleColor || "#7fffe2";
      if (enemy.movementModule === "weave") {
        const weave = Math.sin(this.time * 8 + enemy.seed) * .12;
        this.part(base, this.meshes.wedge, [-.72, -.02, .3 + weave], [.48, .1, .42], moduleColor, [0, -.42, 0], .45);
        this.part(base, this.meshes.wedge, [.72, -.02, .3 - weave], [.48, .1, .42], moduleColor, [0, .42, 0], .45);
      } else if (enemy.movementModule === "rush") {
        const flame = .42 + Math.sin(this.time * 18 + enemy.seed) * .1;
        this.part(base, this.meshes.box, [-.3, -.05, .62], [.14, .13, .3], "#251733");
        this.part(base, this.meshes.box, [.3, -.05, .62], [.14, .13, .3], "#251733");
        this.part(base, this.meshes.octa, [-.3, -.05, .94], [.1, .1, flame], moduleColor, [Math.PI / 2, 0, 0], 1);
        this.part(base, this.meshes.octa, [.3, -.05, .94], [.1, .1, flame], moduleColor, [Math.PI / 2, 0, 0], 1);
      } else if (enemy.movementModule === "drift") {
        this.part(base, this.meshes.torus, [0, -.02, .18], [.86, .18, .86], hexColor(moduleColor, .72), [0, this.time * 1.8 + enemy.seed, 0], .7);
      }

      if (enemy.weaponModule === "twin") {
        this.part(base, this.meshes.box, [-.38, .16, -.58], [.1, .11, .55], moduleColor, [0, 0, 0], .55);
        this.part(base, this.meshes.box, [.38, .16, -.58], [.1, .11, .55], moduleColor, [0, 0, 0], .55);
      } else if (enemy.weaponModule === "sniper") {
        this.part(base, this.meshes.box, [0, .18, -.76], [.1, .1, .9], "#302346");
        this.part(base, this.meshes.octa, [0, .18, -1.18], [.11, .11, .2], moduleColor, [Math.PI / 2, 0, 0], 1);
      } else if (enemy.weaponModule === "orbit") {
        this.part(base, this.meshes.torus, [0, .35, 0], [.72, .16, .72], hexColor(moduleColor, .8), [.22, this.time * 2.6 + enemy.seed, 0], 1);
      }

      if (enemy.coreModule === "plated") {
        this.part(base, this.meshes.box, [-.62, .23, .02], [.24, .28, .66], "#39304d");
        this.part(base, this.meshes.box, [.62, .23, .02], [.24, .28, .66], "#39304d");
        this.part(base, this.meshes.box, [0, .46, .04], [.56, .18, .52], moduleColor, [0, 0, 0], .28);
      } else if (enemy.coreModule === "barrier" && enemy.moduleBarrier > 0) {
        const barrierPulse = 1 + Math.sin(this.time * 11 + enemy.seed) * .04;
        this.part(base, this.meshes.sphere, [0, .12, 0], [1.15 * barrierPulse, .62, 1.15 * barrierPulse], hexColor(moduleColor, .13), [0, this.time, 0], 1);
        this.part(base, this.meshes.torus, [0, .15, 0], [1.04, .2, 1.04], hexColor(moduleColor, .72), [0, -this.time * 1.5, 0], .8);
      } else if (enemy.coreModule === "volatile") {
        const corePulse = .2 + Math.sin(this.time * 10 + enemy.seed) * .035;
        this.part(base, this.meshes.octa, [0, .38, .02], [corePulse, corePulse, corePulse], moduleColor, [this.time, -this.time * 1.4, 0], 1);
        this.part(base, this.meshes.sphere, [0, .38, .02], [.38, .2, .38], hexColor(moduleColor, .12), [0, 0, 0], 1);
      }
      if (enemy.elite) {
        this.part(base, this.meshes.torus, [0, .2, 0], [1.2, .34, 1.2], hexColor("#fff1a0", .68), [0, this.time * 1.6, 0], .8);
        this.part(base, this.meshes.sphere, [0, .12, 0], [1.15, .55, 1.15], hexColor("#ffffff", .08 + Math.sin(this.time * 8) * .025), [0, 0, 0], 1);
      }
      if (enemy.hitFlash > 0) {
        this.part(base, this.meshes.sphere, [0, .14, 0], [1.05, .62, 1.05], hexColor("#ffffff", .5), [0, 0, 0], 1);
      }
    }

    drawBoss(enemy, base) {
      const stage = this.stageIndex;
      const pulse = .5 + Math.sin(this.time * 6) * .5;
      const palettes = enemy.hitFlash > 0 ? ["#ffffff", "#d8e9ff", "#ffffff"] : [
        ["#f26ba5", "#8c2869", "#ffbd78"],
        ["#56d3bd", "#1d6970", "#f3c94f"],
        ["#b84786", "#48144f", "#ff4b6e"],
      ][stage];
      const scale = [1.18, 1.32, 1.48][stage];
      const bossBase = multiply(base, scaling(scale, scale, scale));
      this.part(bossBase, this.meshes.box, [0, .08, 0], [2.5, .55, 1.25], palettes[1]);
      this.part(bossBase, this.meshes.wedge, [0, .28, -.42], [1.3, .72, 1.6], palettes[0]);
      this.part(bossBase, this.meshes.wedge, [-1.35, .05, .1], [1.4, .35, 1.05], palettes[0], [0, -.18, 0]);
      this.part(bossBase, this.meshes.wedge, [1.35, .05, .1], [1.4, .35, 1.05], palettes[0], [0, .18, 0]);
      this.part(bossBase, this.meshes.sphere, [0, .62, -.38], [.48, .32, .58], palettes[2], [0, this.time, 0], .35);
      this.part(bossBase, this.meshes.sphere, [0, .68, -.62], [.2 + pulse * .03, .14, .2], "#ffffff", [0, 0, 0], 1);
      for (const side of [-1, 1]) {
        this.part(bossBase, this.meshes.box, [side * 1.32, -.05, .72], [.3, .24, .58], "#17142b");
        this.part(bossBase, this.meshes.octa, [side * 1.32, -.05, 1.1], [.17, .17, .36], palettes[2], [Math.PI / 2, 0, 0], 1);
      }
      if (stage === 2) {
        this.part(bossBase, this.meshes.torus, [0, .3, .05], [1.8, .38, 1.8], hexColor("#c183ff", .7), [0, this.time * .55, 0], .6);
      }
      if (enemy.phaseShield > 0) {
        const shieldPulse = 1.08 + Math.sin(this.time * 14) * .04;
        this.part(bossBase, this.meshes.sphere, [0, .18, 0], [2.65 * shieldPulse, .95, 1.7 * shieldPulse], hexColor("#ffffff", .13), [0, this.time * .45, 0], 1);
        this.part(bossBase, this.meshes.torus, [0, .28, 0], [2.5, .42, 2.5], hexColor(palettes[2], .78), [0, -this.time * 1.3, 0], 1);
      }
    }

    drawRouteGates(choice) {
      const laneCenters = [this.width * .19, this.width * .5, this.width * .81];
      choice.options.forEach((path, index) => {
        const position = this.toWorld(laneCenters[index], this.height - 63, .22);
        const selected = index === choice.selectedIndex;
        const charge = selected ? .5 + Math.sin(this.time * 8) * .08 + clamp(choice.hold / .68, 0, 1) * .18 : .38;
        const base = compose(position, [Math.PI / 2, this.time * (index % 2 ? -.55 : .55), 0], [1, 1, 1]);
        this.drawMesh(this.meshes.torus, multiply(base, scaling(.82 + charge * .12, .22, .82 + charge * .12)), hexColor(path.color, selected ? .92 : .48), selected ? 1 : .45);
        this.drawMesh(this.meshes.torus, multiply(base, scaling(.54, .12, .54)), hexColor("#ffffff", selected ? .42 : .12), .8);
        for (let point = 0; point < 6; point += 1) {
          const angle = point / 6 * TAU + this.time * (index % 2 ? -.7 : .7);
          this.part(base, this.meshes.octa, [Math.sin(angle) * .88, 0, Math.cos(angle) * .88], [.12, .12, .12], path.color, [angle, angle, 0], selected ? .9 : .4);
        }
        if (selected) {
          this.drawMesh(this.meshes.sphere, compose(position, [0, 0, 0], [1.25, .28, 1.25]), hexColor(path.color, .1 + charge * .08), 1);
        }
      });
    }

    drawEncounter(encounter) {
      if (!encounter) return;
      const position = this.toWorld(encounter.x, encounter.y, encounter.kind === "siege" ? .72 : .2);
      const pulse = .5 + Math.sin(this.time * 7 + encounter.variant) * .08;
      const ratio = encounter.kind === "survive"
        ? 1 - clamp(encounter.timer / encounter.total, 0, 1)
        : clamp(encounter.progress / encounter.goal, 0, 1);
      if (encounter.kind === "hold") {
        const base = compose(position, [0, this.time * .7, 0], [1, 1, 1]);
        this.drawMesh(this.meshes.torus, multiply(base, scaling(1.22, .18, 1.22)), hexColor(encounter.color, .62 + ratio * .25), .9);
        this.drawMesh(this.meshes.sphere, multiply(base, scaling(.48 + ratio * .24, .2, .48 + ratio * .24)), hexColor(encounter.color, .12 + ratio * .14), 1);
        for (let index = 0; index < 4; index += 1) {
          const angle = index / 4 * TAU + this.time * .35;
          this.part(base, this.meshes.box, [Math.sin(angle) * 1.05, .42, Math.cos(angle) * 1.05], [.1, .75 + ratio * .55, .1], encounter.color, [0, angle, 0], .75);
        }
      } else if (encounter.kind === "escort") {
        const base = compose(position, [0, this.time * .8, Math.sin(this.time * 2) * .06], [1, 1, 1]);
        this.part(base, this.meshes.box, [0, .12, 0], [.76, .24, .62], "#253a56");
        this.part(base, this.meshes.wedge, [0, .22, -.32], [.48, .34, .72], encounter.color, [0, 0, 0], .7);
        this.part(base, this.meshes.octa, [0, .42, 0], [.18 + pulse * .04, .18, .18], "#ffffff", [this.time, -this.time, 0], 1);
        this.drawMesh(this.meshes.torus, multiply(base, compose([0, .1, 0], [0, -this.time * 1.4, 0], [.95, .16, .95])), hexColor(encounter.color, .42 + ratio * .3), .9);
      } else if (encounter.kind === "siege") {
        const base = compose(position, [Math.PI / 2, this.time * .5, 0], [1, 1, 1]);
        const health = clamp(encounter.hp / encounter.maxHp, 0, 1);
        this.drawMesh(this.meshes.torus, multiply(base, scaling(1.18 + pulse * .08, .24, 1.18 + pulse * .08)), hexColor(encounter.color, .78), 1);
        this.drawMesh(this.meshes.torus, multiply(base, compose([0, 0, 0], [0, -this.time * 1.7, 0], [.72, .14, .72])), hexColor("#ffffff", .32 + health * .28), .9);
        this.part(base, this.meshes.octa, [0, 0, 0], [.52 * health + .18, .52 * health + .18, .52 * health + .18], encounter.color, [this.time * 1.4, -this.time, 0], 1);
        for (let index = 0; index < 6; index += 1) {
          const angle = index / 6 * TAU - this.time * .9;
          this.part(base, this.meshes.octa, [Math.sin(angle) * 1.2, 0, Math.cos(angle) * 1.2], [.1, .1, .1], "#ffffff", [angle, angle, 0], .7);
        }
      } else if (encounter.kind === "collect") {
        const base = compose(position, [0, this.time * .3, 0], [1, 1, 1]);
        this.drawMesh(this.meshes.torus, multiply(base, scaling(.72 + pulse * .05, .12, .72 + pulse * .05)), hexColor(encounter.color, .28), .7);
      }
    }

    drawEncounterObject(object) {
      const position = this.toWorld(object.x, object.y, object.type === "meteor" ? .38 : .58 + Math.sin(object.age * 4) * .08);
      if (object.type === "salvage") {
        const base = compose(position, [object.age * 1.6, object.age * 2.2, 0], [1, 1, 1]);
        this.drawMesh(this.meshes.octa, multiply(base, scaling(.32, .32, .32)), hexColor(object.color), 1);
        this.drawMesh(this.meshes.torus, multiply(base, scaling(.5, .1, .5)), hexColor(object.color, .42), .9);
      } else if (object.type === "meteor") {
        const scale = .34 + object.r * .018;
        const base = compose(position, [object.rotation, object.rotation * .73, object.rotation * .4], [scale, scale, scale]);
        this.drawMesh(this.meshes.octa, base, hexColor("#6f4052"), .18);
        this.part(base, this.meshes.box, [.34, .08, -.12], [.34, .28, .3], "#9a5a55", [object.rotation, 0, 0], .12);
        this.part(base, this.meshes.box, [-.28, -.12, .22], [.28, .24, .32], object.color, [0, object.rotation, 0], .45);
        this.drawMesh(this.meshes.sphere, compose(position, [0, 0, 0], [scale * 1.35, scale * 1.35, scale * 1.35]), hexColor(object.color, .08), 1);
      }
    }

    drawBiomeFeatures(biome) {
      if (!biome) return;
      const accent = biome.accent || "#7fffe2";
      const secondary = biome.secondary || accent;
      const landmark = biome.landmark;
      if (landmark === "bloom" || landmark === "garden") {
        for (let i = 0; i < 7; i += 1) {
          const x = -9 + i * 3;
          const z = -15 - (i % 3) * 2.8;
          const stem = compose([x, -.15, z], [0, i * .7, 0], [1, 1, 1]);
          this.part(stem, this.meshes.box, [0, .45, 0], [.08, .9, .08], secondary, [0, 0, 0], .35);
          this.part(stem, this.meshes.octa, [0, 1.18, 0], [.38, .38, .38], i % 2 ? accent : secondary, [0, this.time * .22 + i, 0], .65);
        }
      } else if (landmark === "crystals" || landmark === "prisms") {
        for (let i = 0; i < 8; i += 1) {
          const height = 1.2 + (i % 3) * .65;
          this.drawMesh(this.meshes.octa, compose([-10 + i * 2.8, height * .25 - .45, -17 - (i % 2) * 3], [0, i * .4, .12], [.42, height, .42]), hexColor(i % 2 ? accent : secondary, .75), .55);
        }
      } else if (landmark === "comets") {
        for (let i = 0; i < 6; i += 1) {
          const x = -10 + i * 4.1;
          const z = -17 - (i % 3) * 2.5;
          this.drawMesh(this.meshes.sphere, compose([x, 2.6 + (i % 2), z], [0, 0, 0], [.28, .28, .28]), hexColor(secondary), .5);
          this.drawMesh(this.meshes.box, compose([x + 1.2, 2.6 + (i % 2), z + .5], [0, -.35, 0], [.08, .08, 2.6]), hexColor(accent, .36), .8);
        }
      } else if (landmark === "aurora") {
        for (let i = 0; i < 4; i += 1) {
          this.drawMesh(this.meshes.torus, compose([-7 + i * 4.7, 5.2 + (i % 2), -20 - i], [.28, this.time * .04 + i * .4, .15], [2.2, .34, 2.2]), hexColor(i % 2 ? accent : secondary, .28), .7);
        }
      } else if (landmark === "gears") {
        for (let i = 0; i < 3; i += 1) {
          this.drawMesh(this.meshes.torus, compose([-7 + i * 6.5, 1.4 + i, -18 - i * 2], [Math.PI / 2, this.time * (.08 + i * .025), 0], [1.5 + i * .3, .28, 1.5 + i * .3]), hexColor(i % 2 ? accent : secondary, .68), .5);
        }
      } else if (landmark === "reef") {
        for (let i = 0; i < 10; i += 1) {
          const size = .5 + (i % 4) * .22;
          this.drawMesh(this.meshes.sphere, compose([-10 + i * 2.3, -.15 + size, -17 - (i % 3) * 2.2], [0, 0, 0], [size, size * .72, size]), hexColor(i % 2 ? accent : secondary, .5), .3);
        }
      } else if (landmark === "eclipse") {
        this.drawMesh(this.meshes.sphere, compose([-7.7, 5.7, -21], [0, 0, 0], [3.2, 3.2, 3.2]), hexColor("#060510"), .15);
        this.drawMesh(this.meshes.torus, compose([-7.7, 5.7, -21], [.15, this.time * .025, 0], [3.75, .42, 3.75]), hexColor(accent, .88), 1);
      }
    }

    drawLandmark(stageIndex, biome) {
      if (stageIndex === 0) {
        const planet = compose([8.4, 5.1, -20], [0, this.time * .035, 0], [3.1, 3.1, 3.1]);
        this.drawMesh(this.meshes.sphere, planet, hexColor("#c94788"));
        this.part(planet, this.meshes.sphere, [-.35, .3, -.85], [.36, .36, .16], hexColor("#ffad7a", .8), [0, 0, 0], .2);
        this.drawMesh(this.meshes.torus, compose([8.4, 5.1, -20], [.32, 0, -.2], [4.6, .6, 4.6]), hexColor("#f59ac7", .7), .3);
      } else if (stageIndex === 1) {
        for (let i = 0; i < 6; i += 1) {
          const x = -9 + i * 3.7;
          const y = 5.5 + (i % 2) * 1.2;
          this.drawMesh(this.meshes.sphere, compose([x, y, -21 - (i % 3)], [0, 0, 0], [2.2, .65, 1]), hexColor("#4fa9ad", .55));
        }
        const gearBase = compose([7.3, 6.7, -19], [Math.PI / 2, this.time * .12, 0], [2.5, 2.5, 2.5]);
        this.drawMesh(this.meshes.torus, gearBase, hexColor("#e3be4d", .72), .25);
        for (let i = 0; i < 8; i += 1) {
          const angle = i / 8 * TAU;
          this.part(gearBase, this.meshes.box, [Math.sin(angle) * 1.05, 0, Math.cos(angle) * 1.05], [.2, .2, .42], "#e3be4d", [0, angle, 0]);
        }
      } else {
        const base = compose([7.5, 3.5, -22], [0, 0, 0], [1, 1, 1]);
        this.part(base, this.meshes.box, [0, 2.8, 0], [4.2, 7.6, 2.8], "#2b123e");
        this.part(base, this.meshes.wedge, [0, 7.1, 0], [4.4, 2.2, 3], "#5f275b", [0, Math.PI, 0]);
        for (let y = 0; y < 5; y += 1) {
          for (let x = -1; x <= 1; x += 1) {
            this.part(base, this.meshes.box, [x * 1.1, y * 1.15 + .2, -1.45], [.32, .32, .06], y === 4 ? "#ff466b" : "#8a427d", [0, 0, 0], .7);
          }
        }
      }
      this.drawBiomeFeatures(biome);
    }

    drawGrid(accent) {
      const scroll = (this.time * 1.4) % 1.5;
      this.drawMesh(this.meshes.grid, compose([0, -.52, scroll], [0, 0, 0], [1, 1, 1]), hexColor(accent, .36), .35);
    }

    drawStars(starColor) {
      const offset = (this.time * .8) % 18;
      this.drawMesh(this.meshes.stars, compose([0, 0, offset], [0, 0, 0], [1, 1, 1]), hexColor(starColor, .9), .9, 2.2);
      this.drawMesh(this.meshes.stars, compose([0, 0, offset - 38], [0, 0, 0], [1, 1, 1]), hexColor(starColor, .55), .9, 1.4);
    }

    drawProjectile(bullet, enemy = false) {
      const position = this.toWorld(bullet.x, bullet.y, enemy ? .42 : .52);
      if (enemy) {
        const size = .09 + bullet.r * .025;
        const rotation = bullet.age * 4;
        const color = this.highContrastBullets ? "#fff06a" : bullet.color;
        this.drawMesh(this.meshes.octa, compose(position, [rotation, rotation, 0], [size, size, size]), hexColor(color), 1);
        this.drawMesh(this.meshes.sphere, compose(position, [0, 0, 0], [size * 1.9, size * 1.9, size * 1.9]), hexColor(color, this.highContrastBullets ? .24 : .13), 1);
      } else {
        this.drawMesh(this.meshes.box, compose(position, [0, 0, 0], [.055, .055, .3]), hexColor(bullet.color), 1);
      }
    }

    drawPickup(pickup) {
      const position = this.toWorld(pickup.x, pickup.y, .65 + Math.sin(pickup.age * 5) * .12);
      const colors = { weapon: "#ffe36d", repair: "#78f5aa", shield: "#76dbff", energy: "#bc86ff" };
      this.drawMesh(this.meshes.octa, compose(position, [pickup.age * 1.8, pickup.age * 2.4, 0], [.35, .35, .35]), hexColor(colors[pickup.type]), 1);
      this.drawMesh(this.meshes.torus, compose(position, [0, pickup.age, 0], [.55, .55, .55]), hexColor(colors[pickup.type], .45), .8);
    }

    drawParticle(particle) {
      const position = this.toWorld(particle.x, particle.y, .25 + particle.size * .08);
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      const scale = .035 + particle.size * .025;
      this.drawMesh(this.meshes.box, compose(position, [particle.life * 4, 0, 0], [scale, scale, scale]), hexColor(particle.color, alpha), 1);
    }

    drawBeam(playerA, playerB) {
      const a = this.toWorld(playerA.x, playerA.y, .34);
      const b = this.toWorld(playerB.x, playerB.y, .34);
      const dx = b[0] - a[0];
      const dz = b[2] - a[2];
      const length = Math.hypot(dx, dz);
      const middle = [(a[0] + b[0]) / 2, .34, (a[2] + b[2]) / 2];
      const angle = Math.atan2(dx, dz);
      this.drawMesh(this.meshes.box, compose(middle, [0, angle, 0], [.035, .035, length]), hexColor("#92fff0", .72), 1);
      this.drawMesh(this.meshes.box, compose(middle, [0, angle, 0], [.09, .09, length]), hexColor("#ffffff", .09), 1);
    }

    drawRush(world) {
      const pulse = .92 + Math.sin(this.time * 12) * .09;
      const colors = ["#66f6e5", "#ff87ba"];
      const livePlayers = world.players.filter((player) => !player.downed);
      for (const player of livePlayers) {
        const position = this.toWorld(player.x, player.y, .28);
        const color = colors[player.index] || colors[0];
        this.drawMesh(this.meshes.torus, compose(position, [.08, this.time * 2.8 * (player.index ? -1 : 1), 0], [.75 * pulse, .18, .75 * pulse]), hexColor(color, .88), 1);
        this.drawMesh(this.meshes.torus, compose([position[0], .48, position[2]], [.42, -this.time * 3.6, .22], [.48, .11, .48]), hexColor("#fff4a8", .66), 1);
        for (let index = 0; index < 6; index += 1) {
          const angle = this.time * (2.2 + player.index * .25) + index / 6 * TAU + player.index * .5;
          const radius = .86 + Math.sin(this.time * 5 + index) * .07;
          const shard = [position[0] + Math.cos(angle) * radius, .48 + Math.sin(index * 2.1 + this.time * 3) * .14, position[2] + Math.sin(angle) * radius];
          this.drawMesh(this.meshes.box, compose(shard, [angle, angle * .6, 0], [.1, .1, .1]), hexColor(index % 2 ? color : "#fff4a8", .94), 1);
        }
      }
      if (livePlayers.length === 2) {
        const a = this.toWorld(livePlayers[0].x, livePlayers[0].y, .38);
        const b = this.toWorld(livePlayers[1].x, livePlayers[1].y, .38);
        const midpoint = [(a[0] + b[0]) / 2, .56, (a[2] + b[2]) / 2];
        const coreScale = .22 + Math.sin(this.time * 16) * .035;
        this.drawMesh(this.meshes.octa, compose(midpoint, [this.time * 2.8, this.time * 4.2, 0], [coreScale, coreScale, coreScale]), hexColor("#fff4a8", .96), 1);
        this.drawMesh(this.meshes.sphere, compose(midpoint, [0, 0, 0], [.62 * pulse, .62 * pulse, .62 * pulse]), hexColor("#7ffdeb", .13), 1);
      }
    }

    render(world, stages, playerConfigs, settings = {}) {
      if (!this.ready) return false;
      this.quality = settings.quality || "high";
      this.highContrastBullets = settings.bulletContrast === "high";
      this.resize();
      this.time = world.time;
      this.width = 480;
      this.height = 270;
      this.stageIndex = world.stageIndex || 0;
      const stage = stages[this.stageIndex];
      const fog = hexColor(stage.sky);
      const gl = this.gl;
      gl.clearColor(fog[0], fog[1], fog[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.program);
      gl.uniform3fv(this.locations.fog, fog.slice(0, 3));
      gl.uniform3fv(this.locations.light, new Float32Array([-.38, .82, .44]));

      let follow = 0;
      if (world.players?.length && world.mode !== "menu") {
        follow = world.players.reduce((sum, player) => sum + this.toWorld(player.x, player.y)[0], 0) / world.players.length * .08;
      }
      const shakeStrength = Number.isFinite(settings.shake) ? settings.shake : 1;
      const shake = world.shake > 0 ? (Math.random() - .5) * world.shake * .22 * shakeStrength : 0;
      const cinematic = world.cinematic;
      const cinematicProgress = cinematic ? clamp(1 - cinematic.timer / cinematic.total, 0, 1) : 0;
      const cinematicAmount = cinematic ? Math.sin(cinematicProgress * Math.PI) : 0;
      const eye = [follow + shake, 9.2 + shake - cinematicAmount * .65, 12.8 - cinematicAmount * 1.35];
      const target = [follow * .25, -.1, -3.8];
      if (cinematic && (cinematic.type === "boss" || cinematic.type === "phase") && world.boss) {
        const bossPosition = this.toWorld(world.boss.x, world.boss.y, .35);
        target[0] = lerp(target[0], bossPosition[0], cinematicAmount * .7);
        target[1] = lerp(target[1], .35, cinematicAmount * .45);
        target[2] = lerp(target[2], bossPosition[2], cinematicAmount * .5);
      } else if (cinematic?.type === "encounter" && world.activeEncounter) {
        const encounterPosition = this.toWorld(world.activeEncounter.x, world.activeEncounter.y, .3);
        target[0] = lerp(target[0], encounterPosition[0], cinematicAmount * .42);
        target[2] = lerp(target[2], encounterPosition[2], cinematicAmount * .3);
      }
      const projection = perspective(Math.PI / 3.25, this.canvas.width / this.canvas.height, .1, 80);
      this.viewProjection = multiply(projection, lookAt(eye, target, [0, 1, 0]));

      this.drawStars(stage.star);
      this.drawLandmark(this.stageIndex, stage.biome);
      this.drawGrid(stage.grid);

      if (world.mode === "menu") {
        const demoOne = { index: 0, frameId: world.loadoutFrame, x: 4.8 + Math.sin(this.time * .6) * .4, z: -.5 + Math.cos(this.time) * .25 };
        const demoTwo = { index: 1, frameId: world.loadoutFrame, x: 7.2 + Math.sin(this.time * .7) * .5, z: 1.1 + Math.cos(this.time * .8) * .25 };
        this.drawShip(demoOne, playerConfigs[0], true);
        this.drawShip(demoTwo, playerConfigs[1], true);
        return true;
      }

      if (world.routeChoice) this.drawRouteGates(world.routeChoice);
      if (world.activeEncounter) this.drawEncounter(world.activeEncounter);
      for (const object of world.encounterObjects || []) this.drawEncounterObject(object);
      for (const pickup of world.pickups) this.drawPickup(pickup);
      for (const enemy of world.enemies) this.drawEnemy(enemy);
      for (const bullet of world.bullets) this.drawProjectile(bullet, false);
      for (const bullet of world.enemyBullets) this.drawProjectile(bullet, true);
      if (world.linked) this.drawBeam(world.players[0], world.players[1]);
      if (world.rushTimer > 0) this.drawRush(world);
      for (const player of world.players) {
        if (!player.downed && !(player.invulnerability > 0 && Math.floor(world.time * 14) % 2 === 0)) {
          this.drawShip(player, playerConfigs[player.index]);
        } else if (player.downed) {
          const down = { ...player, vx: Math.sin(this.time * 5) * 20, vy: 0 };
          this.drawShip(down, { ...playerConfigs[player.index], color: playerConfigs[player.index].dark });
        }
      }
      for (const particle of world.particles.slice(-180)) this.drawParticle(particle);
      return true;
    }
  }

  window.SpaceRenderer3D = SpaceRenderer3D;
}());

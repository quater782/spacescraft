Unicode true
!include "MUI2.nsh"
!include "x64.nsh"

!ifndef APP_DIR
  !error "APP_DIR is required"
!endif
!ifndef OUTPUT_FILE
  !error "OUTPUT_FILE is required"
!endif
!ifndef APP_VERSION
  !define APP_VERSION "0.27.0"
!endif

Name "SPACECRAFT 星航双子"
OutFile "${OUTPUT_FILE}"
InstallDir "$LOCALAPPDATA\Programs\SPACECRAFT"
InstallDirRegKey HKCU "Software\SPACECRAFT" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey "ProductName" "SPACECRAFT 星航双子"
VIAddVersionKey "FileDescription" "SPACECRAFT Setup / 星航双子安装程序"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "LegalCopyright" "SPACECRAFT Team"

!define MUI_ICON "..\assets\icon.ico"
!define MUI_UNICON "..\assets\icon.ico"
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "SimpChinese"
LangString Need64 ${LANG_ENGLISH} "This application requires 64-bit Windows."
LangString Need64 ${LANG_SIMPCHINESE} "此应用需要 64 位 Windows。"

Function .onInit
  !insertmacro MUI_LANGDLL_DISPLAY
  ${IfNot} ${RunningX64}
    MessageBox MB_OK|MB_ICONSTOP "$(Need64)"
    Abort
  ${EndIf}
  SetRegView 64
  SetShellVarContext current
FunctionEnd

Section
  SetOutPath "$INSTDIR"
  File /r "${APP_DIR}\*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\SPACECRAFT"
  CreateShortcut "$SMPROGRAMS\SPACECRAFT\SPACECRAFT.lnk" "$INSTDIR\SPACECRAFT.exe"
  CreateShortcut "$DESKTOP\SPACECRAFT.lnk" "$INSTDIR\SPACECRAFT.exe"
  WriteRegStr HKCU "Software\SPACECRAFT" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SPACECRAFT" "DisplayName" "SPACECRAFT 星航双子"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SPACECRAFT" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SPACECRAFT" "Publisher" "SPACECRAFT Team"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SPACECRAFT" "DisplayIcon" "$INSTDIR\SPACECRAFT.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SPACECRAFT" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SPACECRAFT" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SPACECRAFT" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SPACECRAFT" "NoRepair" 1
SectionEnd

Section "Uninstall"
  SetRegView 64
  SetShellVarContext current
  Delete "$DESKTOP\SPACECRAFT.lnk"
  Delete "$SMPROGRAMS\SPACECRAFT\SPACECRAFT.lnk"
  RMDir "$SMPROGRAMS\SPACECRAFT"
  ; Remove only packaged files; preserve user-created files and external saves.
  !include "${UNINSTALL_FILES}"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SPACECRAFT"
  DeleteRegKey HKCU "Software\SPACECRAFT"
SectionEnd

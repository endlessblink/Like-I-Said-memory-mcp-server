; Like-I-Said Dashboard Installer Script for Inno Setup

#define MyAppName "Like-I-Said Dashboard"
#define MyAppVersion "2.4.3"
#define MyAppPublisher "EndlessBlink"
#define MyAppURL "https://github.com/endlessblink/Like-I-Said-memory-mcp-server"
#define MyAppExeName "like-i-said-dashboard-win.exe"

[Setup]
AppId={{A7B3C4D5-E6F7-4A5B-9C8D-1E2F3A4B5C6D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\Like-I-Said
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=..\LICENSE
InfoAfterFile=..\README.md
OutputDir=..\dist-installer
OutputBaseFilename=LikeISaidDashboard-{#MyAppVersion}-Setup
SetupIconFile=..\assets\icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Files]
Source: "..\dist-installer\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  
  // Check if dashboard is already running
  if RegKeyExists(HKEY_CURRENT_USER, 'Software\Like-I-Said\Dashboard') then
  begin
    if MsgBox('Like-I-Said Dashboard appears to be installed. Continue with installation?', mbConfirmation, MB_YESNO) = IDNO then
    begin
      Result := False;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // Create registry entry for installed version
    RegWriteStringValue(HKEY_CURRENT_USER, 'Software\Like-I-Said\Dashboard', 'Version', '{#MyAppVersion}');
    RegWriteStringValue(HKEY_CURRENT_USER, 'Software\Like-I-Said\Dashboard', 'InstallPath', ExpandConstant('{app}'));
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    // Remove registry entries
    RegDeleteKeyIncludingSubkeys(HKEY_CURRENT_USER, 'Software\Like-I-Said');
  end;
end;
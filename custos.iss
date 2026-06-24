[Setup]
AppName=Custos
AppVersion=1.0
DefaultDirName=C:\Custos
DefaultGroupName=Custos
PrivilegesRequired=admin
OutputBaseFilename=Custos Installer
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayName=Custos Uninstaller
LicenseFile=media\files\LICENSE.txt

[Dirs]
; This grants standard users permission to write/edit files in the installation folder
Name: "{app}"; Permissions: users-modify

[Files]
; Application files
Source: "dist\*"; DestDir: "{app}\dist"; Flags: recursesubdirs createallsubdirs
Source: "scripts\hide_window.vbs"; DestDir: "{app}\scripts"
Source: "scripts\start_custos.bat"; DestDir: "{app}\scripts"
Source: "scripts\stop_custos.bat"; DestDir: "{app}\scripts"
Source: "erp\*"; DestDir: "{app}\erp"; Flags: recursesubdirs createallsubdirs
Source: "node_modules\*"; DestDir: "{app}\node_modules"; Flags: recursesubdirs createallsubdirs

; Icons
Source: "media\icons\start.ico"; DestDir: "{app}\media\icons"
Source: "media\icons\stop.ico"; DestDir: "{app}\media\icons"
Source: "media\icons\post.ico"; DestDir: "{app}\media\icons"
Source: "media\icons\main.ico"; DestDir: "{app}\media\icons"
Source: "media\icons\edit.ico"; DestDir: "{app}\media\icons"

; Installers
Source: "bin\node-v24.16.0-x64.msi"; DestDir: "{app}\bin"
Source: "bin\python-3.14.5-amd64.exe"; DestDir: "{app}\bin"

Source: "scripts\post_traces.bat"; DestDir: "{app}\scripts"

Source: "media\files\LICENSE.txt"; DestDir: "{app}"
Source: "media\files\README.md"; DestDir: "{app}"

[Icons]
Name: "{group}\Uninstall Custos"; Filename: "{uninstallexe}"

; Start Menu
Name: "{group}\Start Custos"; Filename: "{app}\scripts\hide_window.vbs"; Parameters: """{app}\scripts\start_custos.bat"""; IconFilename: "{app}\media\icons\start.ico"
Name: "{group}\Stop Custos"; Filename: "{app}\scripts\stop_custos.bat"; IconFilename: "{app}\media\icons\stop.ico"

; Desktop
Name: "{autodesktop}\Start Custos"; Filename: "{app}\scripts\hide_window.vbs"; Parameters: """{app}\scripts\start_custos.bat"""; IconFilename: "{app}\media\icons\start.ico"
Name: "{autodesktop}\Stop Custos"; Filename: "{app}\scripts\stop_custos.bat"; IconFilename: "{app}\media\icons\stop.ico"

[Registry]
; 1. Define the Parent Menu
Root: HKLM; Subkey: "SOFTWARE\Classes\Directory\Background\shell\Custos"; ValueType: string; ValueName: "MUIVerb"; ValueData: "Custos"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\Classes\Directory\Background\shell\Custos"; ValueType: string; ValueName: "Icon"; ValueData: "{app}\media\icons\main.ico"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\Classes\Directory\Background\shell\Custos"; ValueType: string; ValueName: "ExtendedSubCommandsKey"; ValueData: "Directory\ContextMenus\Custos"; Flags: uninsdeletekey

Root: HKLM; Subkey: "SOFTWARE\Classes\DesktopBackground\shell\Custos"; ValueType: string; ValueName: "MUIVerb"; ValueData: "Custos"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\Classes\DesktopBackground\shell\Custos"; ValueType: string; ValueName: "Icon"; ValueData: "{app}\media\icons\main.ico"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\Classes\DesktopBackground\shell\Custos"; ValueType: string; ValueName: "ExtendedSubCommandsKey"; ValueData: "Directory\ContextMenus\Custos"; Flags: uninsdeletekey

; 2. Define Context Menu Subcommands with individual icons
; Post Traces Command
Root: HKLM; Subkey: "SOFTWARE\Classes\Directory\ContextMenus\Custos\shell\PostTraces"; ValueType: string; ValueName: "MUIVerb"; ValueData: "Post Traces"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\Classes\Directory\ContextMenus\Custos\shell\PostTraces"; ValueType: string; ValueName: "Icon"; ValueData: "{app}\media\icons\post.ico"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\Classes\Directory\ContextMenus\Custos\shell\PostTraces\command"; ValueType: string; ValueName: ""; ValueData: """{app}\scripts\post_traces.bat"" ""%V"""; Flags: uninsdeletekey

; Edit ERP.env Command
Root: HKLM; Subkey: "SOFTWARE\Classes\Directory\ContextMenus\Custos\shell\EditEnv"; ValueType: string; ValueName: "MUIVerb"; ValueData: "Edit ERP.env"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\Classes\Directory\ContextMenus\Custos\shell\EditEnv"; ValueType: string; ValueName: "Icon"; ValueData: "{app}\media\icons\edit.ico"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\Classes\Directory\ContextMenus\Custos\shell\EditEnv\command"; ValueType: string; ValueName: ""; ValueData: "notepad.exe ""{app}\erp\erp.env"""; Flags: uninsdeletekey

[Run]
; Install Node.js
Filename: "msiexec.exe"; Parameters: "/i ""{app}\bin\node-v24.16.0-x64.msi"" /quiet /norestart"; Check: NeedsNode; StatusMsg: "Installing Node.js..."

; Install Python
Filename: "{app}\bin\python-3.14.5-amd64.exe"; Parameters: "/quiet InstallAllUsers=1 PrependPath=1 Include_launcher=1"; Check: NeedsPython; StatusMsg: "Installing Python..."

; Open the README file after installation
Filename: "{app}\README.md"; Description: "View README.md"; Flags: postinstall shellexec skipifsilent

[Code]
var
  BackupCreated: Boolean;

function IsInPath(const FileName: String): Boolean;
var
  Paths, Path: String;
  i: Integer;
begin
  Result := False;
  if RegQueryStringValue(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment', 'Path', Paths) or
     RegQueryStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', Paths) then
  begin
    while Length(Paths) > 0 do
      begin
        i := Pos(';', Paths);
        if i > 0 then begin
          Path := Copy(Paths, 1, i - 1);
          Delete(Paths, 1, i);
        end else begin
          Path := Paths;
          Paths := '';
        end;
        if FileExists(ExpandConstant(Path + '\' + FileName)) then
        begin
          Result := True;
          Exit;
        end;
      end;
  end;
end;

function NeedsNode(): Boolean;
begin
  Result := not IsInPath('node.exe');
end;

function NeedsPython(): Boolean;
begin
  Result := not IsInPath('python.exe');
end;

function FindPythonWithWhere(): String;
var
  ResultCode: Integer;
  TempFile: String;
  Lines: TArrayOfString;
begin
  Result := '';
  TempFile := ExpandConstant('{tmp}\python_path.txt');
  Exec(
    ExpandConstant('{cmd}'),
    '/c where python > "' + TempFile + '"',
    '',
    SW_HIDE,
    ewWaitUntilTerminated,
    ResultCode
  );
  if (ResultCode = 0) and LoadStringsFromFile(TempFile, Lines) then
  begin
    if GetArrayLength(Lines) > 0 then
      Result := Trim(Lines[0]);
  end;
end;

function FindPythonExe(): String;
var
  Path: String;
begin
  Result := '';
  if RegQueryStringValue(
       HKLM64,
       'SOFTWARE\Python\PythonCore\3.14\InstallPath',
       '',
       Path) then
  begin
    Result := AddBackslash(Path) + 'python.exe';
    if FileExists(Result) then Exit;
  end;
  Result := FindPythonWithWhere();
end;

procedure CreateBackup();
begin
  RegWriteStringValue(HKLM, 'SOFTWARE\CustosBackup', 'Exists', '1');
  BackupCreated := True;
end;

procedure Rollback();
begin
  if BackupCreated then
  begin
    DelTree(ExpandConstant('{app}'), True, True, True);
    RegDeleteValue(HKLM, 'SOFTWARE\CustosBackup', 'Exists');
    RegDeleteKeyIfEmpty(HKLM, 'SOFTWARE\CustosBackup');
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  PythonPath: String;
  ResultCode: Integer;
begin
  if CurStep = ssInstall then
  begin
    CreateBackup();
  end;

  if CurStep = ssPostInstall then
  begin
    try
      PythonPath := FindPythonExe();

      if PythonPath <> '' then
        RegWriteStringValue(
          HKLM,
          'SOFTWARE\Custos',
          'PythonPath',
          PythonPath
        );
        
      RegWriteStringValue(HKLM, 'SOFTWARE\Custos', 'Installed', '1');

      MsgBox(
        'Custos has been installed (or updated) successfully.' + #13#10#13#10 +
        'Node.js or Python were installed if they were missing.',
        mbInformation,
        MB_OK
      );

      if MsgBox(
        'Custos will now install Playwright dependencies.' + #13#10#13#10 +
        'Ensure internet connection is active.',
        mbInformation,
        MB_OKCANCEL
      ) = IDOK then
      begin
        Exec(
          ExpandConstant('{cmd}'),
          '/k cd /d "' + ExpandConstant('{app}') + '" && npx playwright install',
          '',
          SW_SHOW,
          ewNoWait,
          ResultCode
        );
      end;

    except
      Rollback();
      MsgBox('Installation failed. System rolled back.', mbError, MB_OK);
    end;
  end;
end;
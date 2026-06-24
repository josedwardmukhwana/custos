custos.iss
- app should run silently in the background
- check for python and node js installations if not installed install them 
  their directories are C:\Projects\Node\Custos\bin\node-v24.16.0-x64.msi & C:\Projects\Node\Custos\bin\node-v24.16.0-x64.msi python-3.14.5-amd64.exe
- create desktop & start shortcuts for start_custos.bat & stop_custos.bat
- use appropriate icons for start_custos.bat & stop_custos.bat the stored location is 
  media/icons/start_custos.ico & media/icons/stop_custos.ico
- context menu, icon media/icons/post.ico. The main menu title will be
  <<icon>> Custos To ERP, then menus inside will be Send to Custos & Edit env
  remember the edit env is for editing the env file in erp/
- compress the nodemodules folder to the custos installer.exe

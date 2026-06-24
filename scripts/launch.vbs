' hide_window.vbs
Set WshShell = CreateObject("WScript.Shell")
' This will run the batch file passed as an argument hidden
WshShell.Run chr(34) & WScript.Arguments(0) & chr(34), 0
Set WshShell = Nothing
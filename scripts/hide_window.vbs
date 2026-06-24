' hide_window.vbs
' This script runs a command-line application (like a batch file) 
' in the background without a visible window.
Set WshShell = CreateObject("WScript.Shell")

' WScript.Arguments(0) is the path to the batch file passed from the shortcut
' The "0" as the second argument tells Windows to hide the window
WshShell.Run chr(34) & WScript.Arguments(0) & chr(34), 0

Set WshShell = Nothing
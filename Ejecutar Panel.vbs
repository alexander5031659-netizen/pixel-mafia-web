Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

appPath = fso.GetParentFolderName(WScript.ScriptFullName)
cmd = "cmd /c cd /d """ & appPath & """ && npx electron ."

WshShell.Run cmd, 0, False

Set WshShell = Nothing
Set fso = Nothing

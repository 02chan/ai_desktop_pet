!macro customUnInstall
  ; Remove the startup registry entries created by app.setLoginItemSettings on Windows.
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AI DeskPet"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "react-example"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "com.desktop.pet"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\RunOnce" "AI DeskPet"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\RunOnce" "react-example"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\RunOnce" "com.desktop.pet"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "AI DeskPet"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "react-example"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "com.desktop.pet"

  ; Remove any current-user startup shortcuts.
  SetShellVarContext current
  Delete "$SMSTARTUP\AI DeskPet.lnk"
  Delete "$SMSTARTUP\react-example.lnk"
  Delete "$SMSTARTUP\com.desktop.pet.lnk"
!macroend

# Testing log

## 2026-11-15 - Virtual machine
- Setup: Fedora Workstation (GNOME {gnome-version}) in GNOME Boxes, extension installed from the packed zip.
- Results:
  - The extension loads and does not break the desktop; the top bar icon and its menu work.
  - Nothing happened at first: the virtual screen is not a built-in screen. Fixed by falling back to the primary screen.
  - After the fix, the manual orientations rotate the screen, and `orientation landscape` (gsettings) brings it back.
  - Not yet checked: `gnome-extensions disable` restoring the original orientation.
- Issue: in a rotated orientation, mouse clicks land in the wrong place. The virtual machine's pointer is an absolute USB tablet, which sends positions of the unrotated window. This is a limitation of the virtual machine; GNOME Settings' rotation behaves the same.
  - Recovery without the mouse: `Super`, type `terminal`, `Enter`, then `gsettings --schemadir ~/.local/share/gnome-shell/extensions/auto-orientation@a-mcorp.github.io/schemas set org.gnome.shell.extensions.auto-orientation orientation landscape`, or reboot (the rotation is temporary and not saved).
  - Tried: removing `<input type="tablet" bus="usb">` in Boxes (**Preferences → Edit Configuration**). Clicks then follow the rotation, but the mouse becomes unusable (captured input, broken buttons, pointer not reaching the edges). Reverted; the change only applies after a full shutdown of the virtual machine.

## 2026-11-15 - Laptop (CHUWI MiniBook X)
- Setup: Fedora Silverblue 45, extension installed from the packed zip.
- Results:
  - Auto rotates the screen from the accelerometer.
  - Issue: in the normal laptop position, Auto turns the screen to Portrait Right. The accelerometer is mounted at an angle to the screen, like the panel itself. Added "Set Current Position as Default" (Auto correction) to define the resting position.
  - With the correction set, Auto rotates the screen correctly in all four directions. This also covers the manual orientations, which apply the same four transforms through the same code.
  - Not yet checked: `gnome-extensions disable` restoring the original orientation, touch input in rotated orientations.

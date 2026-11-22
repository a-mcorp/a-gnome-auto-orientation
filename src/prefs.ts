// ================================
// Name: 'a-gnome-auto-orientation'/src/prefs.ts
// Source: https://github.com/a-mcorp/a-gnome-auto-orientation
// SPDX-License-Identifier: GPL-3.0-or-later
// Year: 2026
// ================================

import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

// Auto-generated: Same choices and order as the top bar menu in extension.ts.
const orientationModes: [string, string][] = [
  ["auto", "Auto"],
  ["landscape", "Landscape"],
  ["portrait-right", "Portrait Right"],
  ["landscape-flipped", "Landscape (Flipped)"],
  ["portrait-left", "Portrait Left"],
];

// Auto-generated: Values of the "sensor-offset" key, in 90° steps.
const sensorOffsets = ["None", "90°", "180°", "270°"];

export default class AutoOrientationPreferences extends ExtensionPreferences {
  override fillPreferencesWindow(
    window: Adw.PreferencesWindow,
  ): Promise<void> {
    const settings = this.getSettings();

    const pageGeneral = new Adw.PreferencesPage({
      title: _("General"),
      iconName: "preferences-desktop-display-symbolic",
    });
    const groupOrientation = new Adw.PreferencesGroup({
      title: _("Screen"),
    });
    const rowOrientation = new Adw.ComboRow({
      title: _("Orientation"),
      subtitle: _("Auto follows the accelerometer"),
      model: Gtk.StringList.new(orientationModes.map(([, label]) => _(label))),
    });

    const rowOffset = new Adw.ComboRow({
      title: _("Correction"),
      subtitle: _("Turns every accelerometer reading in Auto"),
      model: Gtk.StringList.new(sensorOffsets.map((label) => _(label))),
    });

    const groupCorrection = new Adw.PreferencesGroup({
      title: _("Auto correction"),
      description: _(
        "The accelerometer of your device may treat a different position as the default one than the position you use. On first use, Auto takes the device's current position as the default. To change it later, hold the device in its usual position, then click “Set Current Position as Default” in the top bar menu, or pick the correction below.",
      ),
    });

    groupOrientation.add(rowOrientation);
    groupCorrection.add(rowOffset);
    pageGeneral.add(groupOrientation);
    pageGeneral.add(groupCorrection);
    window.add(pageGeneral);

    const rowSelectedUpdate = (): void => {
      const index = orientationModes.findIndex(([id]) =>
        id === settings.get_string("orientation")
      );
      rowOrientation.selected = Math.max(index, 0);
    };
    rowSelectedUpdate();

    rowOrientation.connect("notify::selected", () => {
      const id = orientationModes[rowOrientation.selected]?.[0];
      if (id && id !== settings.get_string("orientation")) {
        settings.set_string("orientation", id);
      }
    });
    const settingsHandlerId = settings.connect(
      "changed::orientation",
      rowSelectedUpdate,
    );

    const rowOffsetUpdate = (): void => {
      rowOffset.selected = settings.get_int("sensor-offset");
    };
    rowOffsetUpdate();
    rowOffset.connect("notify::selected", () => {
      if (rowOffset.selected !== settings.get_int("sensor-offset")) {
        settings.set_int("sensor-offset", rowOffset.selected);
      }
    });
    const settingsOffsetHandlerId = settings.connect(
      "changed::sensor-offset",
      rowOffsetUpdate,
    );

    window.connect("close-request", () => {
      settings.disconnect(settingsHandlerId);
      settings.disconnect(settingsOffsetHandlerId);
      return false;
    });

    return Promise.resolve();
  }
}

import Gio from "gi://Gio";
import GLib from "gi://GLib";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";

type OrientationMode =
  | "auto"
  | "landscape"
  | "portrait-right"
  | "landscape-flipped"
  | "portrait-left";

// Auto-generated: Transforms of org.gnome.Mutter.DisplayConfig (0 = normal, 1 = 90°, 2 = 180°, 3 = 270°), named as in GNOME Settings.
const orientationModes: {
  id: OrientationMode;
  label: string;
  transform: number | null;
}[] = [
  { id: "auto", label: "Auto", transform: null },
  { id: "landscape", label: "Landscape", transform: 0 },
  { id: "portrait-right", label: "Portrait Right", transform: 1 },
  { id: "landscape-flipped", label: "Landscape (Flipped)", transform: 2 },
  { id: "portrait-left", label: "Portrait Left", transform: 3 },
];

// Auto-generated: Accelerometer orientations of iio-sensor-proxy, mapped to transforms the same way as GNOME's own auto-rotation.
const sensorTransforms: Record<string, number> = {
  "normal": 0,
  "left-up": 1,
  "bottom-up": 2,
  "right-up": 3,
};

const rotationDelayMs = 1000;
const calibrateTimeoutMs = 3000;

const displayBusName = "org.gnome.Mutter.DisplayConfig";
const displayObjectPath = "/org/gnome/Mutter/DisplayConfig";
const sensorBusName = "net.hadess.SensorProxy";
const sensorObjectPath = "/net/hadess/SensorProxy";
const propertiesInterface = "org.freedesktop.DBus.Properties";

type MonitorSpec = [string, string, string, string];
type MonitorMode = [
  string,
  number,
  number,
  number,
  number,
  number[],
  Record<string, unknown>,
];
type Monitor = [MonitorSpec, MonitorMode[], Record<string, unknown>];
type LogicalMonitor = [
  number,
  number,
  number,
  number,
  boolean,
  MonitorSpec[],
  Record<string, unknown>,
];
type DisplayState = [
  number,
  Monitor[],
  LogicalMonitor[],
  Record<string, unknown>,
];

function errorCancelledCheck(error: unknown): boolean {
  return error instanceof GLib.Error &&
    error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED);
}

async function displayStateFetch(): Promise<DisplayState> {
  const reply = await Gio.DBus.session.call(
    displayBusName,
    displayObjectPath,
    displayBusName,
    "GetCurrentState",
    null,
    null,
    Gio.DBusCallFlags.NONE,
    -1,
    null,
  );
  return reply.recursiveUnpack() as DisplayState;
}

function monitorBuiltinFind(state: DisplayState): Monitor | undefined {
  return state[1].find((monitor) => monitor[2]["is-builtin"] === true);
}

// Auto-generated: Targets the built-in screen, or the primary screen when there is none (e.g. in a virtual machine).
function logicalMonitorBuiltinFind(
  state: DisplayState,
): LogicalMonitor | undefined {
  const connector = monitorBuiltinFind(state)?.[0][0];
  if (connector === undefined) {
    return state[2].find((logical) => logical[4]);
  }
  return state[2].find((logical) =>
    logical[5].some((spec) => spec[0] === connector)
  );
}

async function transformBuiltinGet(): Promise<number | null> {
  return logicalMonitorBuiltinFind(await displayStateFetch())?.[3] ?? null;
}

// Auto-generated: Changes only the built-in screen's transform and keeps the rest of the layout. The "temporary" method does not save it to monitors.xml.
async function transformBuiltinSet(transform: number): Promise<void> {
  const state = await displayStateFetch();
  const [serial, monitors, logicalMonitors] = state;
  const logicalBuiltin = logicalMonitorBuiltinFind(state);
  if (!logicalBuiltin || logicalBuiltin[3] === transform) return;

  const modeCurrentId = (connector: string): string =>
    monitors
      .find((monitor) => monitor[0][0] === connector)?.[1]
      .find((mode) => mode[6]["is-current"] === true)?.[0] ?? "";

  const logicalConfig: [
    number,
    number,
    number,
    number,
    boolean,
    [string, string, Record<string, GLib.Variant>][],
  ][] = logicalMonitors.map((logical) => [
    logical[0],
    logical[1],
    logical[2],
    logical === logicalBuiltin ? transform : logical[3],
    logical[4],
    logical[5].map((spec) => [spec[0], modeCurrentId(spec[0]), {}]),
  ]);

  const methodTemporary = 1;
  await Gio.DBus.session.call(
    displayBusName,
    displayObjectPath,
    displayBusName,
    "ApplyMonitorsConfig",
    new GLib.Variant("(uua(iiduba(ssa{sv}))a{sv})", [
      serial,
      methodTemporary,
      logicalConfig,
      {},
    ]),
    null,
    Gio.DBusCallFlags.NONE,
    -1,
    null,
  );
}

// Auto-generated: Uses its own system bus connection, so closing it releases the sensor without affecting GNOME Shell's own claim.
class AccelerometerWatcher {
  private connection: Gio.DBusConnection | null = null;
  private subscriptionId: number | null = null;
  private cancellable: Gio.Cancellable | null = null;

  constructor(private readonly orientationChange: (value: string) => void) {}

  async start(): Promise<void> {
    const cancellable = new Gio.Cancellable();
    this.cancellable = cancellable;
    const address = Gio.dbus_address_get_for_bus_sync(
      Gio.BusType.SYSTEM,
      cancellable,
    );
    const connection = await new Promise<Gio.DBusConnection>(
      (resolve, reject) => {
        Gio.DBusConnection.new_for_address(
          address,
          Gio.DBusConnectionFlags.AUTHENTICATION_CLIENT |
            Gio.DBusConnectionFlags.MESSAGE_BUS_CONNECTION,
          null,
          cancellable,
          (_source, result) => {
            try {
              resolve(Gio.DBusConnection.new_for_address_finish(result));
            } catch (error) {
              reject(error);
            }
          },
        );
      },
    );
    if (cancellable.is_cancelled()) {
      connection.close(null, null);
      return;
    }
    this.connection = connection;

    this.subscriptionId = connection.signal_subscribe(
      sensorBusName,
      propertiesInterface,
      "PropertiesChanged",
      sensorObjectPath,
      null,
      Gio.DBusSignalFlags.NONE,
      (_connection, _sender, _path, _interface, _signal, parameters) => {
        const changed = (parameters.recursiveUnpack() as [
          string,
          Record<string, unknown>,
          string[],
        ])[1];
        const orientation = changed["AccelerometerOrientation"];
        if (typeof orientation === "string") {
          this.orientationChange(orientation);
        }
      },
    );

    await connection.call(
      sensorBusName,
      sensorObjectPath,
      sensorBusName,
      "ClaimAccelerometer",
      null,
      null,
      Gio.DBusCallFlags.NONE,
      -1,
      cancellable,
    );
    const reply = await connection.call(
      sensorBusName,
      sensorObjectPath,
      propertiesInterface,
      "Get",
      new GLib.Variant("(ss)", [sensorBusName, "AccelerometerOrientation"]),
      null,
      Gio.DBusCallFlags.NONE,
      -1,
      cancellable,
    );
    const orientation = (reply.recursiveUnpack() as [unknown])[0];
    if (typeof orientation === "string") this.orientationChange(orientation);
  }

  stop(): void {
    this.cancellable?.cancel();
    this.cancellable = null;
    if (this.connection && this.subscriptionId !== null) {
      this.connection.signal_unsubscribe(this.subscriptionId);
    }
    this.subscriptionId = null;
    this.connection?.close(null, null);
    this.connection = null;
  }
}

export default class AutoOrientationExtension extends Extension {
  private settings: Gio.Settings | null = null;
  private settingsHandlerId: number | null = null;
  private indicator: PanelMenu.Button | null = null;
  private indicatorIcon: St.Icon | null = null;
  private menuItems = new Map<OrientationMode, PopupMenu.PopupMenuItem>();
  private menuItemCalibrate: PopupMenu.PopupMenuItem | null = null;
  private watcher: AccelerometerWatcher | null = null;
  private watcherCalibrate: AccelerometerWatcher | null = null;
  private calibrateSourceId: number | null = null;
  private rotationSourceId: number | null = null;
  private transformOriginal: number | null = null;
  private transformChanged = false;
  private transformCurrent: number | null = null;
  private stateCaptured = false;
  private sensorTransformLast: number | null = null;

  override enable(): void {
    this.settings = this.getSettings();
    this.indicatorCreate();
    this.settingsHandlerId = this.settings.connect(
      "changed",
      (_settings, key: string) => {
        if (key === "orientation") this.modeApply();
        if (key === "sensor-offset") {
          // Auto-generated: A correction set by hand or with the button replaces the first-use calibration.
          if (!this.settings?.get_boolean("sensor-calibrated")) {
            this.settings?.set_boolean("sensor-calibrated", true);
          }
          this.sensorOffsetApply();
        }
      },
    );

    // Auto-generated: Remembers the orientation before any change, so disable() can restore it.
    transformBuiltinGet()
      .then((transform) => {
        if (!this.settings) return;
        this.transformOriginal = transform;
        this.transformCurrent = transform;
        this.stateCaptured = true;
        this.modeApply();
      })
      .catch((error) => console.warn(`${this.uuid}: ${error}`));
  }

  override disable(): void {
    if (this.settings && this.settingsHandlerId !== null) {
      this.settings.disconnect(this.settingsHandlerId);
    }
    this.settingsHandlerId = null;
    this.settings = null;

    this.rotationCancel();
    this.watcher?.stop();
    this.watcher = null;
    this.calibrateStop();

    this.menuItems.clear();
    this.menuItemCalibrate = null;
    this.indicator?.destroy();
    this.indicator = null;
    this.indicatorIcon = null;

    if (this.transformChanged && this.transformOriginal !== null) {
      transformBuiltinSet(this.transformOriginal).catch((error) =>
        console.warn(`${this.uuid}: ${error}`)
      );
    }
    this.transformOriginal = null;
    this.transformChanged = false;
    this.transformCurrent = null;
    this.stateCaptured = false;
    this.sensorTransformLast = null;
  }

  private indicatorCreate(): void {
    this.indicator = new PanelMenu.Button(0.0, this.metadata.name, false);
    this.indicatorIcon = new St.Icon({ styleClass: "system-status-icon" });
    this.indicator.add_child(this.indicatorIcon);

    const menu = this.indicator.menu as PopupMenu.PopupMenu;
    for (const mode of orientationModes) {
      const item = new PopupMenu.PopupMenuItem(_(mode.label));
      item.connect("activate", () => {
        this.settings?.set_string("orientation", mode.id);
      });
      menu.addMenuItem(item);
      this.menuItems.set(mode.id, item);
    }
    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    // Auto-generated: Makes the current accelerometer reading the default (landscape) position, for sensors mounted at an angle.
    this.menuItemCalibrate = new PopupMenu.PopupMenuItem(
      _("Set Current Position as Default"),
    );
    this.menuItemCalibrate.connect("activate", () => this.calibrate());
    menu.addMenuItem(this.menuItemCalibrate);
    menu.addAction(_("Settings"), () => this.openPreferences());

    Main.panel.addToStatusArea(this.uuid, this.indicator);
    this.indicatorUpdate();
  }

  private indicatorUpdate(): void {
    const modeCurrent = this.settings?.get_string("orientation");
    for (const [id, item] of this.menuItems) {
      item.setOrnament(
        id === modeCurrent ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE,
      );
    }
    this.menuItemCalibrate?.setSensitive(this.watcherCalibrate === null);
    if (this.indicatorIcon) {
      this.indicatorIcon.iconName = modeCurrent === "auto"
        ? "rotation-allowed-symbolic"
        : "rotation-locked-symbolic";
    }
  }

  private modeApply(): void {
    this.indicatorUpdate();
    if (!this.settings || !this.stateCaptured) return;

    const mode = orientationModes.find((entry) =>
      entry.id === this.settings?.get_string("orientation")
    );
    if (!mode || mode.transform === null) {
      if (!this.watcher) {
        this.watcher = new AccelerometerWatcher((value) =>
          this.sensorChange(value)
        );
        this.watcher.start().catch((error) => {
          if (!errorCancelledCheck(error)) {
            console.warn(`${this.uuid}: ${error}`);
          }
        });
      }
      return;
    }

    this.rotationCancel();
    this.watcher?.stop();
    this.watcher = null;
    this.sensorTransformLast = null;
    this.indicatorUpdate();
    this.transformApply(mode.transform);
  }

  // Auto-generated: Adds the "sensor-offset" setting (in 90° steps) to a raw accelerometer transform.
  private sensorTransformCorrect(transform: number): number {
    return (transform + (this.settings?.get_int("sensor-offset") ?? 0)) % 4;
  }

  private sensorOffsetApply(): void {
    if (
      this.settings?.get_string("orientation") !== "auto" ||
      this.sensorTransformLast === null
    ) return;
    this.rotationCancel();
    this.transformApply(this.sensorTransformCorrect(this.sensorTransformLast));
  }

  // Auto-generated: Waits until the reading has been stable for rotationDelayMs, so the screen does not flip while the device moves.
  private sensorChange(orientation: string): void {
    const transform = sensorTransforms[orientation];
    if (transform === undefined) return;
    this.sensorTransformLast = transform;
    this.indicatorUpdate();

    // Auto-generated: On first use, the current position keeps the current screen orientation instead of rotating it.
    if (
      this.settings && !this.settings.get_boolean("sensor-calibrated") &&
      this.transformCurrent !== null
    ) {
      this.sensorOffsetSet(transform, this.transformCurrent);
      return;
    }

    this.rotationCancel();
    this.rotationSourceId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      rotationDelayMs,
      () => {
        this.rotationSourceId = null;
        this.transformApply(this.sensorTransformCorrect(transform));
        return GLib.SOURCE_REMOVE;
      },
    );
  }

  // Auto-generated: Uses the last reading in Auto; in the manual modes, reads the sensor once and releases it again (gives up after calibrateTimeoutMs).
  private calibrate(): void {
    if (this.sensorTransformLast !== null) {
      this.sensorOffsetSet(this.sensorTransformLast);
      return;
    }
    if (this.watcherCalibrate) return;

    this.watcherCalibrate = new AccelerometerWatcher((value) => {
      const transform = sensorTransforms[value];
      if (transform === undefined) return;
      this.calibrateStop();
      this.sensorOffsetSet(transform);
    });
    this.watcherCalibrate.start().catch((error) => {
      if (!errorCancelledCheck(error)) console.warn(`${this.uuid}: ${error}`);
      this.calibrateStop();
    });
    this.calibrateSourceId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      calibrateTimeoutMs,
      () => {
        this.calibrateSourceId = null;
        this.calibrateStop();
        return GLib.SOURCE_REMOVE;
      },
    );
    this.indicatorUpdate();
  }

  private calibrateStop(): void {
    if (this.calibrateSourceId !== null) {
      GLib.Source.remove(this.calibrateSourceId);
    }
    this.calibrateSourceId = null;
    this.watcherCalibrate?.stop();
    this.watcherCalibrate = null;
    this.indicatorUpdate();
  }

  // Auto-generated: Chooses the correction so that the raw reading shows the target transform (0 = landscape).
  private sensorOffsetSet(transformRaw: number, transformTarget = 0): void {
    this.settings?.set_int(
      "sensor-offset",
      (transformTarget - transformRaw + 4) % 4,
    );
    this.settings?.set_boolean("sensor-calibrated", true);
  }

  private rotationCancel(): void {
    if (this.rotationSourceId !== null) {
      GLib.Source.remove(this.rotationSourceId);
    }
    this.rotationSourceId = null;
  }

  private transformApply(transform: number): void {
    this.transformChanged = true;
    this.transformCurrent = transform;
    transformBuiltinSet(transform).catch((error) =>
      console.warn(`${this.uuid}: ${error}`)
    );
  }
}

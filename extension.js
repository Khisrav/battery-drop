/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const BatteryDropIndicator = GObject.registerClass(
class BatteryDropIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('Battery Discharge Rate'));

        // Create main label for panel
        this._label = new St.Label({
            text: '---%/h',
            y_align: 2, // Clutter.ActorAlign.CENTER
        });
        this.add_child(this._label);

        // Battery monitoring variables
        this._batteryPercentage = 0;
        this._lastPercentage = 0;
        this._lastCheckTime = 0;
        this._dischargeRate = 0;
        this._batteryHistory = [];
        this._isCharging = false;

        // Create popup menu items
        this._createMenu();

        // Start monitoring
        this._updateBatteryInfo();
        this._startMonitoring();
    }

    _createMenu() {
        // Current battery percentage
        this._batteryItem = new PopupMenu.PopupMenuItem('Battery: --%');
        this.menu.addMenuItem(this._batteryItem);

        // Discharge rate
        this._rateItem = new PopupMenu.PopupMenuItem('Discharge Rate: -- %/h');
        this.menu.addMenuItem(this._rateItem);

        // Status (charging/discharging)
        this._statusItem = new PopupMenu.PopupMenuItem('Status: Unknown');
        this.menu.addMenuItem(this._statusItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Estimated time remaining
        this._timeItem = new PopupMenu.PopupMenuItem('Est. Time: --');
        this.menu.addMenuItem(this._timeItem);
    }

    _getBatteryInfo() {
        try {
            // Read battery info from /sys/class/power_supply/BAT0/ or BAT1/
            let batteryPath = null;
            for (let i = 0; i <= 1; i++) {
                let path = `/sys/class/power_supply/BAT${i}/`;
                let dir = Gio.File.new_for_path(path);
                if (dir.query_exists(null)) {
                    batteryPath = path;
                    break;
                }
            }

            if (!batteryPath) {
                return { percentage: 0, charging: false, found: false };
            }

            // Read capacity (percentage)
            let capacityFile = Gio.File.new_for_path(batteryPath + 'capacity');
            let [success, contents] = capacityFile.load_contents(null);
            if (!success) return { percentage: 0, charging: false, found: false };
            
            let percentage = parseInt(new TextDecoder().decode(contents).trim());

            // Read status (charging/discharging)
            let statusFile = Gio.File.new_for_path(batteryPath + 'status');
            [success, contents] = statusFile.load_contents(null);
            if (!success) return { percentage, charging: false, found: true };
            
            let status = new TextDecoder().decode(contents).trim();
            let charging = status === 'Charging';

            return { percentage, charging, found: true };
        } catch (e) {
            console.error('Error reading battery info:', e);
            return { percentage: 0, charging: false, found: false };
        }
    }

    _updateBatteryInfo() {
        let batteryInfo = this._getBatteryInfo();
        
        if (!batteryInfo.found) {
            this._label.set_text('No BAT');
            return;
        }

        this._batteryPercentage = batteryInfo.percentage;
        this._isCharging = batteryInfo.charging;

        let currentTime = GLib.get_real_time() / 1000000; // Convert to seconds

        // Calculate discharge rate if we have previous data
        if (this._lastCheckTime > 0 && !this._isCharging) {
            let timeDiff = currentTime - this._lastCheckTime;
            let percentageDiff = this._lastPercentage - this._batteryPercentage;
            
            if (timeDiff > 0 && percentageDiff >= 0) {
                // Calculate rate in %/hour
                let ratePerSecond = percentageDiff / timeDiff;
                let ratePerHour = ratePerSecond * 3600;
                
                // Store in history for averaging
                this._batteryHistory.push(ratePerHour);
                
                // Keep only last 10 readings for smoothing
                if (this._batteryHistory.length > 10) {
                    this._batteryHistory.shift();
                }
                
                // Calculate average discharge rate
                let sum = this._batteryHistory.reduce((a, b) => a + b, 0);
                this._dischargeRate = sum / this._batteryHistory.length;
            }
        }

        // Update panel text
        if (this._isCharging) {
            this._label.set_text('CHG');
        } else if (this._dischargeRate > 0) {
            this._label.set_text(`${this._dischargeRate.toFixed(1)}%/h`);
        } else {
            this._label.set_text('---%/h');
        }

        // Update menu items
        this._batteryItem.label.set_text(`Battery: ${this._batteryPercentage}%`);
        
        if (this._isCharging) {
            this._rateItem.label.set_text('Discharge Rate: Charging');
            this._statusItem.label.set_text('Status: Charging');
            this._timeItem.label.set_text('Est. Time: Charging');
        } else {
            this._rateItem.label.set_text(`Discharge Rate: ${this._dischargeRate.toFixed(2)} %/h`);
            this._statusItem.label.set_text('Status: Discharging');
            
            // Calculate estimated time remaining
            if (this._dischargeRate > 0) {
                let hoursRemaining = this._batteryPercentage / this._dischargeRate;
                let hours = Math.floor(hoursRemaining);
                let minutes = Math.floor((hoursRemaining - hours) * 60);
                this._timeItem.label.set_text(`Est. Time: ${hours}h ${minutes}m`);
            } else {
                this._timeItem.label.set_text('Est. Time: Calculating...');
            }
        }

        // Store current values for next calculation
        this._lastPercentage = this._batteryPercentage;
        this._lastCheckTime = currentTime;
    }

    _startMonitoring() {
        // Update every 30 seconds
        this._timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => {
            this._updateBatteryInfo();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopMonitoring() {
        if (this._timeout) {
            GLib.source_remove(this._timeout);
            this._timeout = null;
        }
    }

    destroy() {
        this._stopMonitoring();
        super.destroy();
    }
});

export default class BatteryDropExtension extends Extension {
    enable() {
        this._indicator = new BatteryDropIndicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

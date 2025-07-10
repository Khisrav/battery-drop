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
        this._dischargeRate = 0;
        this._batteryHistory = [];
        this._isCharging = false;
        
        // Average tracking since extension start
        this._allRateReadings = [];
        this._startTime = GLib.get_real_time() / 1000000;

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

        // Current rate
        this._rateItem = new PopupMenu.PopupMenuItem('Current Rate: -- %/h');
        this.menu.addMenuItem(this._rateItem);

        // Average since boot
        this._avgItem = new PopupMenu.PopupMenuItem('Avg Since Start: -- %/h');
        this.menu.addMenuItem(this._avgItem);

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
                return { percentage: 0, charging: false, found: false, powerRate: 0 };
            }

            // Read capacity (percentage)
            let capacityFile = Gio.File.new_for_path(batteryPath + 'capacity');
            let [success, contents] = capacityFile.load_contents(null);
            if (!success) return { percentage: 0, charging: false, found: false, powerRate: 0 };
            
            let percentage = parseInt(new TextDecoder().decode(contents).trim());

            // Read status (charging/discharging)
            let statusFile = Gio.File.new_for_path(batteryPath + 'status');
            [success, contents] = statusFile.load_contents(null);
            if (!success) return { percentage, charging: false, found: true, powerRate: 0 };
            
            let status = new TextDecoder().decode(contents).trim();
            let charging = status === 'Charging';

            let powerRate = 0;
            
            // Calculate power rate (positive when charging, negative when discharging)
            // Formula: (power_now_watts / energy_full_watt_hours) * 100 = % per hour
            
            // Read current power consumption/input (in microwatts)
            let powerFile = Gio.File.new_for_path(batteryPath + 'power_now');
            [success, contents] = powerFile.load_contents(null);
            if (success) {
                let powerMicrowatts = parseInt(new TextDecoder().decode(contents).trim());
                let powerWatts = powerMicrowatts / 1000000; // Convert to watts
                
                // Read full available capacity (in microwatt-hours)
                let energyFile = Gio.File.new_for_path(batteryPath + 'energy_full');
                [success, contents] = energyFile.load_contents(null);
                if (success) {
                    let energyMicrowattHours = parseInt(new TextDecoder().decode(contents).trim());
                    let energyWattHours = energyMicrowattHours / 1000000; // Convert to watt-hours
                    
                    if (energyWattHours > 0 && powerWatts > 0) {
                        // Calculate percentage rate per hour
                        let ratePerHour = (powerWatts / energyWattHours) * 100;
                        
                        // Make negative for discharging, positive for charging
                        powerRate = charging ? ratePerHour : -ratePerHour;
                    }
                }
            }

            return { percentage, charging, found: true, powerRate };
        } catch (e) {
            console.error('Error reading battery info:', e);
            return { percentage: 0, charging: false, found: false, powerRate: 0 };
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
        this._dischargeRate = batteryInfo.powerRate;

        // Store in history for averaging (smooth out fluctuations)
        if (this._dischargeRate !== 0) {
            this._batteryHistory.push(this._dischargeRate);
            this._allRateReadings.push(this._dischargeRate);
            
            // Keep only last 5 readings for smoothing current rate
            if (this._batteryHistory.length > 5) {
                this._batteryHistory.shift();
            }
            
            // Calculate average current rate
            let sum = this._batteryHistory.reduce((a, b) => a + b, 0);
            this._dischargeRate = sum / this._batteryHistory.length;
        }

        // Update panel text with average rate
        if (this._allRateReadings.length === 0) {
            this._label.set_text('---%/h');
        } else {
            let avgSum = this._allRateReadings.reduce((a, b) => a + b, 0);
            let avgRate = avgSum / this._allRateReadings.length;
            let sign = avgRate >= 0 ? '+' : '';
            this._label.set_text(`${sign}${avgRate.toFixed(1)}%/h`);
        }

        // Update menu items
        this._batteryItem.label.set_text(`Battery: ${this._batteryPercentage}%`);
        
        // Current rate
        if (this._dischargeRate === 0) {
            this._rateItem.label.set_text('Current Rate: --');
        } else {
            let sign = this._dischargeRate >= 0 ? '+' : '';
            this._rateItem.label.set_text(`Current Rate: ${sign}${this._dischargeRate.toFixed(2)} %/h`);
        }
        
        // Average since start
        if (this._allRateReadings.length > 0) {
            let avgSum = this._allRateReadings.reduce((a, b) => a + b, 0);
            let avgRate = avgSum / this._allRateReadings.length;
            let avgSign = avgRate >= 0 ? '+' : '';
            let uptimeHours = ((GLib.get_real_time() / 1000000) - this._startTime) / 3600;
            this._avgItem.label.set_text(`Avg Since Start: ${avgSign}${avgRate.toFixed(2)} %/h (${uptimeHours.toFixed(1)}h)`);
        } else {
            this._avgItem.label.set_text('Avg Since Start: Calculating...');
        }
        
        // Status
        this._statusItem.label.set_text(`Status: ${this._isCharging ? 'Charging' : 'Discharging'}`);
        
        // Time estimation
        if (this._isCharging && this._dischargeRate > 0) {
            let hoursToFull = (100 - this._batteryPercentage) / this._dischargeRate;
            let hours = Math.floor(hoursToFull);
            let minutes = Math.floor((hoursToFull - hours) * 60);
            this._timeItem.label.set_text(`Est. Time to Full: ${hours}h ${minutes}m`);
        } else if (!this._isCharging && this._dischargeRate < 0) {
            let hoursRemaining = this._batteryPercentage / Math.abs(this._dischargeRate);
            let hours = Math.floor(hoursRemaining);
            let minutes = Math.floor((hoursRemaining - hours) * 60);
            this._timeItem.label.set_text(`Est. Time Remaining: ${hours}h ${minutes}m`);
        } else {
            this._timeItem.label.set_text('Est. Time: Calculating...');
        }
    }

    _startMonitoring() {
        // Update every 10 seconds for more responsive readings
        this._timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
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

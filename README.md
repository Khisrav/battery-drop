# Battery Drop Rate Extension

A GNOME Shell extension that displays your battery charge/discharge rate in % per hour directly in the top panel, with positive values for charging and negative values for discharging.

![Battery Drop Rate Extension](https://img.shields.io/badge/GNOME%20Shell-48-blue)
![License](https://img.shields.io/badge/license-GPL--2.0--or--later-green)

## Features

### Panel Display
- **Average rate display**: Shows running average rate since extension start in `%/h` format
- **Positive/Negative values**: Positive for charging (e.g., "+12.3%/h"), negative for discharging (e.g., "-8.5%/h")
- **Real-time updates**: Updates every 10 seconds with power-based calculations
- **Error handling**: Shows "No BAT" if no battery is detected

### Dropdown Menu
- **Current battery percentage**: Live battery level display
- **Current rate**: Instant power-based rate with high precision
- **Average since start**: Running average rate since extension was enabled, with uptime
- **Battery status**: Shows whether the battery is charging or discharging
- **Smart time estimation**: 
  - When charging: "Est. Time to Full"
  - When discharging: "Est. Time Remaining"

## How It Works

The extension monitors your battery using precise power measurements:

1. **Power-based calculations**: Reads actual power consumption from `/sys/class/power_supply/BAT*/power_now`
2. **Capacity awareness**: Uses full available capacity from `/sys/class/power_supply/BAT*/energy_full`
3. **Formula**: `(power_watts / capacity_watt_hours) × 100 = % per hour`
4. **Data smoothing**: Uses rolling averages to provide stable readings
5. **Continuous tracking**: Maintains average since extension start for long-term trends
6. **Regular updates**: Checks battery status every 10 seconds

## Installation

### Method 1: Manual Installation
1. Clone or download this repository
2. Copy the extension folder to your GNOME Shell extensions directory:
   ```bash
   cp -r battery-drop@khisrav ~/.local/share/gnome-shell/extensions/
   ```
3. Restart GNOME Shell:
   - Press `Alt + F2`
   - Type `r` and press Enter
   - Or log out and log back in
4. Enable the extension using GNOME Extensions app or command line:
   ```bash
   gnome-extensions enable battery-drop@khisrav
   ```

### Method 2: Using GNOME Extensions Website
*(If/when published to extensions.gnome.org)*

## Usage

Once installed and enabled:

1. **Panel View**: The average charge/discharge rate appears in your top panel next to other system indicators
2. **Detailed View**: Click on the panel indicator to see detailed battery information and current rates
3. **Immediate readings**: No waiting period - displays accurate rates immediately using power measurements

## Compatibility

- **GNOME Shell**: Version 48+
- **System**: Linux systems with standard battery interfaces (`/sys/class/power_supply/`)
- **Hardware**: Laptops and devices with rechargeable batteries that expose power consumption data

## Screenshots

### Panel View
The extension shows average rate directly in the top panel:
```
-8.5%/h  ↑0.6 kB  ↓0.3 kB  🔲  ⚡  en  📱  📶  🔊  🔋71%
```
*Negative value indicates discharging at 8.5% per hour*

### Dropdown Menu
Click to see detailed battery information:
- Battery: 71%
- Current Rate: -8.45 %/h
- Avg Since Start: -6.23 %/h (2.3h)
- Status: Discharging
- Est. Time Remaining: 8h 25m

## Technical Details

### Battery Detection
The extension automatically detects your battery by checking for:
- `/sys/class/power_supply/BAT0/`
- `/sys/class/power_supply/BAT1/`

### Rate Calculation
- **Power measurement**: Reads real-time power consumption in watts
- **Capacity calculation**: Uses actual battery capacity (accounting for aging)
- **Formula**: `(current_power_watts / full_capacity_watt_hours) × 100`
- **Sign convention**: Positive = charging, Negative = discharging
- **Averaging**: Multiple smoothing levels for stability

### Data Tracking
- **Current rate**: 5-reading rolling average for immediate display
- **Average since start**: All readings since extension enabled
- **Uptime tracking**: Shows how long extension has been monitoring

### Error Handling
- Gracefully handles missing battery files
- Shows appropriate messages when battery is not detected
- Continues running even if temporary read errors occur
- Falls back gracefully if power measurement files are unavailable

## Development

### File Structure
```
battery-drop@khisrav/
├── extension.js      # Main extension code
├── metadata.json     # Extension metadata
└── README.md        # This file
```

### Key Components
- `BatteryDropIndicator`: Main panel button and menu handler
- `_getBatteryInfo()`: Reads battery data and calculates power-based rates
- `_updateBatteryInfo()`: Updates displays and manages averaging
- `_startMonitoring()`: Manages 10-second update cycles

### Key Features
- **Real-time power monitoring**: Direct hardware power consumption readings
- **Dual averaging**: Short-term smoothing + long-term average tracking
- **Smart time estimates**: Different calculations for charging vs discharging scenarios

## Contributing

Contributions are welcome! Please feel free to:
- Report bugs or issues
- Suggest new features
- Submit pull requests
- Improve documentation

## License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 2 of the License, or (at your option) any later version.

See the [GNU General Public License](http://www.gnu.org/licenses/) for more details.

## Troubleshooting

### Extension not showing
- Ensure GNOME Shell version compatibility
- Check that the extension is enabled in GNOME Extensions
- Restart GNOME Shell (`Alt + F2`, type `r`, press Enter)

### "No BAT" message
- Verify your system has a battery at `/sys/class/power_supply/BAT0/` or `/BAT1/`
- Check file permissions for battery information access

### Shows "---%/h"
- Wait a few seconds for initial power measurements
- Ensure your system exposes `power_now` and `energy_full` files
- Some systems may need to be actively using/charging battery for readings

### Rate seems too high/low
- Values are based on current power consumption, which varies with system load
- Average since start provides better long-term accuracy
- Charging rates depend on charger wattage and battery state

## Author

Created by khisrav

---

*This extension helps you monitor your battery health and optimize power usage by providing real-time power-based charge/discharge rate information with long-term averaging.* 
# Battery Drop Rate Extension

A GNOME Shell extension that displays your battery discharge rate in % per hour directly in the top panel.

![Battery Drop Rate Extension](https://img.shields.io/badge/GNOME%20Shell-48-blue)
![License](https://img.shields.io/badge/license-GPL--2.0--or--later-green)

## Features

### Panel Display
- **Real-time discharge rate**: Shows current battery drain in `%/h` format (e.g., "5.2%/h")
- **Charging indicator**: Displays "CHG" when the battery is charging
- **Error handling**: Shows "No BAT" if no battery is detected

### Dropdown Menu
- **Current battery percentage**: Live battery level display
- **Detailed discharge rate**: More precise discharge rate with decimal places
- **Battery status**: Shows whether the battery is charging or discharging
- **Time estimation**: Calculates estimated time remaining based on current discharge rate

## How It Works

The extension monitors your battery by:

1. **Reading system files**: Accesses `/sys/class/power_supply/BAT0/` (or `BAT1/`) for battery information
2. **Calculating rates**: Tracks battery percentage changes over time to compute discharge rate
3. **Data smoothing**: Uses a rolling average of the last 10 readings for stable, accurate results
4. **Regular updates**: Checks battery status every 30 seconds

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

1. **Panel View**: The discharge rate appears in your top panel next to other system indicators
2. **Detailed View**: Click on the panel indicator to see the dropdown menu with detailed battery information
3. **Initial Setup**: Allow a few minutes for accurate readings as the extension collects initial data

## Compatibility

- **GNOME Shell**: Version 48+
- **System**: Linux systems with standard battery interfaces (`/sys/class/power_supply/`)
- **Hardware**: Laptops and devices with rechargeable batteries

## Screenshots

### Panel View
The extension shows discharge rate directly in the top panel:
```
30.0%/h  ↑0.6 kB  ↓0.3 kB  🔲  ⚡  en  📱  📶  🔊  🔋71%
```

### Dropdown Menu
Click to see detailed battery information:
- Battery: 71%
- Discharge Rate: 30.12 %/h
- Status: Discharging
- Est. Time: 2h 21m

## Technical Details

### Battery Detection
The extension automatically detects your battery by checking for:
- `/sys/class/power_supply/BAT0/`
- `/sys/class/power_supply/BAT1/`

### Rate Calculation
- Monitors battery percentage changes over time intervals
- Calculates rate as: `(percentage_drop / time_elapsed) × 3600` seconds/hour
- Uses rolling average for smooth, stable readings

### Error Handling
- Gracefully handles missing battery files
- Shows appropriate messages when battery is not detected
- Continues running even if temporary read errors occur

## Development

### File Structure
```
battery-drop@khisrav/
├── extension.js      # Main extension code
├── metadata.json     # Extension metadata
├── stylesheet.css    # Extension styling
└── README.md        # This file
```

### Key Components
- `BatteryDropIndicator`: Main panel button and menu handler
- `_getBatteryInfo()`: Reads battery data from system files
- `_updateBatteryInfo()`: Calculates discharge rates and updates display
- `_startMonitoring()`: Manages periodic updates

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

### Inaccurate readings
- Allow a few minutes for the extension to collect sufficient data
- Very low discharge rates may appear as "0.0%/h" due to measurement precision

## Author

Created by khisrav

---

*This extension helps you monitor your battery health and optimize power usage by providing real-time discharge rate information.* 
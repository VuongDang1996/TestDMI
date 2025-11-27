# ETCS DMI Simulation

A web-based simulation of the European Train Control System (ETCS) Driver Machine Interface (DMI). This project provides a realistic, interactive interface for training and demonstration purposes.

## Features

*   **Realistic DMI Layout**: Accurate 640x480 pixel resolution with correct aspect ratio and grid layout.
*   **Cockpit View**: Immersive driver's cab environment with a windshield view and moving background.
*   **Simulation Logic**:
    *   Circular Speed Gauge (CSG) with dynamic color changes (Grey, Yellow, Orange, Red) based on speed and status.
    *   Real-time speed monitoring and supervision.
    *   Distance to Target bar with logarithmic scaling.
*   **Interactive Controls**:
    *   **Engineer's Panel**: Collapsible side panel for adjusting simulation parameters (Speed, Permitted Speed, Target, Mode, Level, etc.).
    *   **Precision Inputs**: Number inputs synced with sliders for exact value control.
    *   **Keyboard Shortcuts**:
        *   `Arrow Up`: Increase Speed
        *   `Arrow Down`: Decrease Speed
        *   `Space`: Emergency Brake (Set speed to 0)
        *   `M`: Cycle Mode
    *   **Audio Feedback**: Audible alarms for Overspeed and Intervention statuses.
*   **Learning Mode**: Interactive tooltips explaining each DMI area and symbol when hovered.
*   **Scenarios**: Pre-configured scenarios (Normal, Approaching, Overspeed, etc.) to quickly test different states.
*   **Recorder**: Record and playback simulation sessions.

## How to Run

Simply open `index.html` in any modern web browser. No installation or server is required.

## Controls

| Key | Action |
| :--- | :--- |
| **Arrow Up** | Increase Current Speed (+1 km/h) |
| **Arrow Down** | Decrease Current Speed (-1 km/h) |
| **Space** | Emergency Brake (Speed = 0) |
| **M** | Cycle ETCS Mode (FS, OS, SH, etc.) |

## Interface Guide

*   **Toggle Controls**: Click the "⚙️ Controls" button to open/close the Engineer's Panel.
*   **Learning Mode**: Click "🎓 Learning Mode" to enable hover-tooltips.
*   **Sound**: Click "🔊 Sound On/Off" to toggle audio alarms.

## License

This project is for educational purposes.

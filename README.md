# Timeline Graphics JS

An interactive, embeddable SVG timeline visualization built with vanilla JavaScript. Perfect for displaying personal histories, project timelines, career progressions, and more.

![Timeline Demo](https://img.shields.io/badge/demo-live-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

- **📊 Interactive Visualization**: Pan and zoom to explore your timeline
- **🎨 Customizable Styling**: Configure colors, fonts, and visual styles via JSON
- **📱 Responsive Design**: Adapts to different screen sizes
- **🔌 Embeddable**: Easy iframe integration for WordPress, blogs, and websites
- **💾 Export Capability**: Download your timeline as SVG
- **🎯 Multiple Item Types**: Support for ranges, milestones, and background bands
- **🎭 Visual Styles**: Choose from `bar-in-label`, `bar-below`, or `point-label` styles
- **🌐 No Dependencies**: Pure vanilla JavaScript, HTML, and CSS

## 🚀 Quick Start

### Local Development

1. Clone this repository:
```bash
git clone https://github.com/yourusername/time-graphics-js.git
cd time-graphics-js
```

2. Open `index.html` in your browser (or use a local server):
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve
```

3. Navigate to `http://localhost:8000`

### Embedding in Your Website

```html
<iframe
  src="https://yourdomain.com/timeline/index.html?data=my-timeline.json"
  style="width: 100%; height: 600px; border: none;"
  loading="lazy"
></iframe>
```

## 📝 Data Format

Create a JSON file with your timeline data:

```json
{
  "settings": {
    "start": "2000-01-01",
    "end": "2025-01-01",
    "defaultColor": "#0de7e7",
    "backgroundColor": "#2c2d2f",
    "tracks": [
      {
        "id": "career",
        "label": "Career",
        "position": "top"
      }
    ]
  },
  "items": [
    {
      "id": "job-1",
      "type": "range",
      "label": "Software Engineer",
      "start": "2020-01-01",
      "end": "2023-06-01",
      "track": "career",
      "color": "#c73a52",
      "style": "bar-in-label",
      "desc": "Built amazing things"
    }
  ]
}
```

### Item Types

- **`range`**: Time periods with start and end dates
- **`milestone`**: Single point-in-time events
- **`band`**: Background periods spanning the full timeline height

### Visual Styles

- **`bar-in-label`**: Text displayed inside the bar
- **`bar-below`**: Text displayed below the bar
- **`point-label`**: Text displayed next to milestone points

## 🎨 Color Palette

The default theme uses a modern dark palette:

- **Background**: `#2c2d2f` (Dark gray)
- **Primary**: `#0de7e7` (Cyan)
- **Accent**: `#c73a52` (Red/Pink)
- **Text**: `#eeeeee` (Light gray)

Customize colors in your `data.json` file.

## 🔧 Configuration

### Query Parameters

- `data`: Path to your JSON data file
  - Example: `?data=career-timeline.json`

### Settings Options

| Property | Type | Description |
|----------|------|-------------|
| `start` | String | Timeline start date (ISO format) |
| `end` | String | Timeline end date (ISO format) |
| `defaultColor` | String | Default color for items (hex) |
| `backgroundColor` | String | Background color (hex) |
| `tracks` | Array | Track definitions |

### Item Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | String | Yes | Unique identifier |
| `type` | String | Yes | `range`, `milestone`, or `band` |
| `label` | String | Yes | Display text |
| `start` | String | For ranges/bands | Start date (ISO format) |
| `end` | String | Optional | End date (null = ongoing) |
| `date` | String | For milestones | Event date (ISO format) |
| `track` | String | Yes | Track ID |
| `color` | String | Optional | Item color (hex) |
| `style` | String | Optional | Visual style |
| `desc` | String | Optional | Tooltip description |
| `lane` | Number | Optional | Vertical offset within track |

## 🖱️ Interactions

- **Pan**: Click and drag to move horizontally
- **Zoom**: Mouse wheel to zoom in/out
- **Tooltips**: Hover over items to see details
- **Export**: Click "Export SVG" button to download

## 📁 Project Structure

```
time-graphics-js/
├── index.html          # Main HTML file
├── timeline.js         # Core timeline logic
├── styles.css          # Styling
├── data.json           # Sample timeline data
├── data.js             # Embedded data (for local testing)
├── README.md           # This file
└── LICENSE             # MIT License
```

## 🌟 Use Cases

- **Personal Portfolio**: Showcase your career journey
- **Project History**: Document project milestones
- **Company Timeline**: Display organizational history
- **Educational Path**: Visualize academic progression
- **Product Roadmap**: Plan and communicate releases

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with vanilla JavaScript for maximum compatibility
- Inspired by modern timeline visualization tools
- Uses Roboto font from Google Fonts

---

**Made with ❤️ using vanilla JavaScript**

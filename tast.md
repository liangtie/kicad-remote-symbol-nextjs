# Implement KiCad Remote Symbol Panel


## GOAL

You'd add a "Place" button in the page app\kicadLibrary\page.tsx 

On clicking the "Place" button, you'd send the KiCad Part( Component) including symbol footprint and 3dmodel shown as below through the webview.

Before sending the part, you'd send a "NEW_SESSION" message to the KiCad , and the kicad will reply with a session id, you'd use it for the "PLACE_COMPONENT" command including the part.

```json
{
    "symbol" : "https://www.eda.cn/all/32/LM73.kicad_sym",
    "footprint" : "https://www.eda.cn/all/32/SOT-23-6.kicad_mod",
    "3dmodel" : "https://www.eda.cn/all/32/SOT-23-6.step"
}
```

## Architecture

1. KiCad will setup a "kicad" message channel to the webview.
2. WebView need can then send messages to the KiCad via the "kicad" channel.



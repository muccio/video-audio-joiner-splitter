import Cocoa

let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)

image.lockFocus()

guard let ctx = NSGraphicsContext.current?.cgContext else {
    exit(1)
}

// 1. Background Rounded Squircle (macOS style)
let rect = CGRect(x: 100, y: 100, width: 824, height: 824)
let cornerRadius: CGFloat = 185
let path = CGPath(roundedRect: rect, cornerWidth: cornerRadius, cornerHeight: cornerRadius, transform: nil)

// Shadow
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -20), blur: 50, color: CGColor(red: 0, green: 0, blue: 0, alpha: 0.55))
ctx.addPath(path)
ctx.setFillColor(CGColor(red: 0.07, green: 0.08, blue: 0.12, alpha: 1.0))
ctx.fillPath()
ctx.restoreGState()

// Gradient fill
ctx.saveGState()
ctx.addPath(path)
ctx.clip()

let colorSpace = CGColorSpaceCreateDeviceRGB()
let colors = [
    CGColor(red: 0.06, green: 0.08, blue: 0.15, alpha: 1.0),
    CGColor(red: 0.12, green: 0.15, blue: 0.28, alpha: 1.0)
] as CFArray
if let gradient = CGGradient(colorsSpace: colorSpace, colors: colors, locations: [0.0, 1.0]) {
    ctx.drawLinearGradient(gradient, start: CGPoint(x: 512, y: 924), end: CGPoint(x: 512, y: 100), options: [])
}

// Subtle border
ctx.restoreGState()
ctx.saveGState()
ctx.addPath(path)
ctx.setStrokeColor(CGColor(red: 1, green: 1, blue: 1, alpha: 0.12))
ctx.setLineWidth(6)
ctx.strokePath()
ctx.restoreGState()

// 2. Neon accents & symbols
// Video Camera / Reel icon outline
let videoRect = CGRect(x: 280, y: 440, width: 320, height: 240)
let videoPath = CGPath(roundedRect: videoRect, cornerWidth: 36, cornerHeight: 36, transform: nil)
ctx.saveGState()
ctx.addPath(videoPath)
let vidColors = [
    CGColor(red: 0.04, green: 0.52, blue: 1.0, alpha: 0.9), // Apple Blue
    CGColor(red: 0.39, green: 0.82, blue: 1.0, alpha: 0.9)  // Cyan
] as CFArray
if let vidGrad = CGGradient(colorsSpace: colorSpace, colors: vidColors, locations: [0.0, 1.0]) {
    ctx.clip()
    ctx.drawLinearGradient(vidGrad, start: CGPoint(x: 280, y: 680), end: CGPoint(x: 600, y: 440), options: [])
}
ctx.restoreGState()

// Lens triangle
let lensPath = CGMutablePath()
lensPath.move(to: CGPoint(x: 630, y: 630))
lensPath.addLine(to: CGPoint(x: 740, y: 690))
lensPath.addLine(to: CGPoint(x: 740, y: 430))
lensPath.addLine(to: CGPoint(x: 630, y: 490))
lensPath.closeSubpath()

ctx.saveGState()
ctx.addPath(lensPath)
ctx.setFillColor(CGColor(red: 0.04, green: 0.52, blue: 1.0, alpha: 0.95))
ctx.fillPath()
ctx.restoreGState()

// 3. Audio Waveform (Emerald / Purple Gradient below video)
let waveY: CGFloat = 310
let barWidth: CGFloat = 16
let spacing: CGFloat = 28
let heights: [CGFloat] = [40, 70, 120, 180, 240, 160, 210, 140, 190, 110, 60, 35]

for (i, h) in heights.enumerated() {
    let x = 320 + CGFloat(i) * spacing
    let barRect = CGRect(x: x, y: waveY - h/2, width: barWidth, height: h)
    let barPath = CGPath(roundedRect: barRect, cornerWidth: 8, cornerHeight: 8, transform: nil)
    
    ctx.saveGState()
    ctx.addPath(barPath)
    let t = CGFloat(i) / CGFloat(heights.count)
    let r = 0.19 + t * 0.56
    let g = 0.82 - t * 0.46
    let b = 0.35 + t * 0.60
    ctx.setFillColor(CGColor(red: r, green: g, blue: b, alpha: 0.95))
    ctx.fillPath()
    ctx.restoreGState()
}

image.unlockFocus()

guard let tiffData = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiffData),
      let pngData = bitmap.representation(using: .png, properties: [:]) else {
    exit(1)
}

let outputPath = URL(fileURLWithPath: "assets/icon.png")
try? pngData.write(to: outputPath)
print("Icon PNG created at: assets/icon.png")

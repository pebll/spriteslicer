# Sprite Sheet Slicer

You ever wanted to get the individual sprites for a spritesheet of which you don't know exactly the sizes, margins, and offsets? This is the solution! Import any sprite sheet, manually adjust the parameters with help of intuitive visual preview, and get your sliced sprites in an instant!

<img width="1220" height="709" alt="image" src="https://github.com/user-attachments/assets/f174d32d-cd83-4b4d-b193-c21bddae160d" />


## Run locally

```bash
npm install
npm run dev
```

## Build for production

```bash
npm run build
```

Output in `dist/` folder - deploy to any static host.

## Usage

1. Click **Choose File** to upload a sprite sheet
2. Enter the number of columns and rows in your grid
3. Fine-tune with the overlay boxes:
   - **Red** - Position & size of first sprite (drag corner to resize)
   - **Blue** - Horizontal gap between sprites
   - **Yellow** - Vertical gap between sprites
4. Click **Export Sprites** to download a ZIP of all sliced PNGs

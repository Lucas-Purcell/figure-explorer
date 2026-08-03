# Figure Explorer

Figure Explorer is a VS Code extension for browsing figures generated in open Jupyter notebooks.

## Features

- Automatically discovers figures in open `.ipynb` notebooks.
- Keeps the explorer synchronized as notebook outputs change.
- Groups figures by notebook.
- Displays a dedicated Gallery dashboard with thumbnails and a selected preview.
- Reveals the source notebook cell for any figure.
- Supports plot titles with a first-line cell comment:

  ```python
  # figure: Residual distribution
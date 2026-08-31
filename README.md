# Multimodal AI Detection In Two Words &mdash; project page

Static site for the paper, built on the [Clarity Template](https://shikun.io/projects/clarity)
and matching the structure of the group's other project pages.

```
index.html                     the page
assets/stylesheets/neo.css     project-specific styles (everything else is template)
assets/stylesheets/main_free.css, clarity/   template
assets/fonts/Charter, fonts/Charter          body serif (clarity.css resolves ../fonts)
figures/                       panels of Fig. 1 from the paper
paper/paper.pdf                the manuscript
tools/build_artifact.py        folds the site into one self-contained HTML for preview
```

Deployed from `main` via GitHub Pages; no build step is required for the site itself.

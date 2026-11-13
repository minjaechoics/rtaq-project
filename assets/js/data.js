/* =========================================================================
   RTAQ project page — numbers reported in the paper.
   Table 1, Fig. 2, Fig. 3, Fig. 4 (Fig. 5 lives in data-figures.js).
   Edit LINKS below to point the hero buttons at your PDF / arXiv / code.
   ========================================================================= */
window.RTAQ_LINKS = {
  pdf: "",          // e.g. "https://arxiv.org/pdf/xxxx.xxxxx"
  arxiv: "",        // e.g. "https://arxiv.org/abs/xxxx.xxxxx"
  code: "https://github.com/minjaechoics/RTAQ",
  checkpoints: ""   // e.g. "https://huggingface.co/<org>"
};

window.RTAQ_DATA = {
  benchmarks: ["GSM8K", "AIME25", "AIME26", "GPQA-D (strict)", "GPQA-D (flex)", "LiveCodeBench"],
  benchShort: ["GSM8K", "AIME25", "AIME26", "GPQA strict", "GPQA flex", "LCB"],
  methods: ["BF16", "GPTQ", "MC-MoE", "GSQ", "TileQ", "RTAQ"],
  methodCite: {
    "BF16": "Original model",
    "GPTQ": "Frantar et al., 2022",
    "MC-MoE": "Huang et al., 2025",
    "GSQ": "Dadgarnia et al., 2026",
    "TileQ": "Gu et al., 2026",
    "RTAQ": "Ours"
  },
  models: [
    {
      id: "qwen36", name: "Qwen3.6-35B-A3B", short: "Qwen3.6 35B",
      experts: 10240, pinned: 223, pinnedPct: 2.18, btarget: 2.022, grid: [128, 80],
      rows: {
        "BF16":   { bits: 16,    acc: [96.8, 91.1, 91.1, 82.3, 83.0, 77.6], avg: 87.85 },
        "GPTQ":   { bits: 2.250, acc: [95.7, 80.0, 81.1, 71.2, 72.9, 50.1], avg: 75.79 },
        "MC-MoE": { bits: 2.358, acc: [96.3, 88.9, 85.6, 71.9, 72.6, 72.3], avg: 83.07 },
        "GSQ":    { bits: 2.125, acc: [96.0, 84.4, 86.7, 79.8, 80.6, 66.4], avg: 82.74 },
        "TileQ":  { bits: 2.320, acc: [95.2, 82.2, 86.7, 73.7, 71.7, 49.4], avg: 77.24 },
        "RTAQ":   { bits: 2.022, acc: [96.6, 90.0, 93.3, 78.6, 79.3, 70.2], avg: 85.81 }
      },
      /* Fig. 3: average generation length (x10^3 tokens), read from the vector figure */
      genLen: { "BF16": 23.05, "GPTQ": 29.37, "MC-MoE": 22.26, "GSQ": 29.49, "TileQ": 28.05, "RTAQ": 24.30 },
      /* Fig. 4: share of routed experts per quantization level K */
      alloc: { 3: 50.74, 4: 7.13, 5: 8.79, 6: 31.16, 7: 0.00, 8: 2.18 }
    },
    {
      id: "nemotron", name: "Nemotron-3-Nano-30B-A3B", short: "Nemotron 3 Nano",
      experts: 2944, pinned: 74, pinnedPct: 2.51, btarget: 2.025, grid: [64, 46],
      rows: {
        "BF16":   { bits: 16,    acc: [96.1, 87.8, 90.0, 72.7, 73.1, 66.2], avg: 82.60 },
        "GPTQ":   { bits: 2.250, acc: [94.7, 85.6, 80.0, 58.9, 59.4, 51.9], avg: 74.27 },
        "MC-MoE": { bits: 2.358, acc: [94.2, 81.1, 84.4, 63.8, 63.8, 58.0], avg: 76.30 },
        "GSQ":    { bits: 2.125, acc: [93.6, 82.2, 82.2, 38.2, 37.7, 60.1], avg: 71.21 },
        "TileQ":  { bits: 2.301, acc: [94.0, 81.1, 74.4, 60.6, 60.4, 52.2], avg: 72.44 },
        "RTAQ":   { bits: 2.025, acc: [94.3, 81.1, 85.6, 67.2, 67.0, 60.3], avg: 77.68 }
      },
      genLen: { "BF16": 19.90, "GPTQ": 22.22, "MC-MoE": 22.32, "GSQ": 26.46, "TileQ": 29.49, "RTAQ": 23.02 },
      alloc: { 3: 39.37, 4: 22.96, 5: 16.07, 6: 19.09, 7: 0.00, 8: 2.51 }
    },
    {
      id: "qwen3next", name: "Qwen3-Next-80B-A3B-Thinking", short: "Qwen3-Next 80B",
      experts: 24576, pinned: 396, pinnedApprox: true, pinnedPct: 1.61, btarget: 2.016, grid: [192, 128],
      rows: {
        "BF16":   { bits: 16,    acc: [96.6, 85.6, 88.9, 75.6, 75.3, 68.2], avg: 82.95 },
        "GPTQ":   { bits: 2.250, acc: [96.1, 78.9, 87.8, 65.2, 63.3, 58.3], avg: 77.07 },
        "MC-MoE": { bits: 2.358, acc: [96.1, 84.4, 91.1, 59.6, 58.8, 57.8], avg: 77.72 },
        "GSQ":    { bits: 2.125, acc: [96.4, 83.3, 84.4, 62.3, 58.2, 56.0], avg: 76.07 },
        "TileQ":  { bits: 2.307, acc: [96.1, 80.0, 87.8, 68.2, 68.7, 61.6], avg: 78.79 },
        "RTAQ":   { bits: 2.016, acc: [96.4, 84.4, 88.9, 72.2, 70.5, 64.1], avg: 81.03 }
      },
      genLen: { "BF16": 14.98, "GPTQ": 16.12, "MC-MoE": 15.70, "GSQ": 16.30, "TileQ": 16.48, "RTAQ": 15.38 },
      alloc: { 3: 50.57, 4: 8.78, 5: 7.03, 6: 32.01, 7: 0.00, 8: 1.61 }
    }
  ],

  /* Fig. 2a — activation rate at closing positions, Qwen3-Next-80B-A3B on GPQA-Diamond.
     30 bins of width 1/30 over [0, 1]; counts sum to 24,576 routed experts. */
  fig2a: {
    model: "Qwen3-Next-80B-A3B", dataset: "GPQA-Diamond", uniform: 10 / 512,
    counts: [23789, 87, 40, 29, 24, 22, 15, 17, 18, 23, 10, 10, 11, 12, 11,
             8, 9, 9, 13, 9, 14, 10, 12, 11, 17, 8, 20, 13, 45, 260]
  },

  speedup: { mlp: 4.01, e2e: 2.33 }
};

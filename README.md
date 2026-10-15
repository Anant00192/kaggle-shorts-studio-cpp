# 🎬 Kaggle Batch Shorts Studio

Automated Headless Batch Shorts Generator powered by Kaggle GPU.

## ✨ Features
- **Multi-Shorts Processing**: Process 1 to 10 short videos in sequential batch.
- **Bulletproof Seed-VC**: Fast, studio-grade voice conversion (diff step 12 + pinned Wan2GP commit `6479db36bdc2619a904a852bba9c2d78e1a83f82`).
- **Instant 0-Second Model Mounting**: Pre-attaches `seedvc-master-models` dataset.
- **Real-ESRGAN 4K AI Upscaling**: Upscales every short with animevideov3 model.
- **Smart Looping BGM**: Detects best drops and ducks under cloned narration.
- **Auto Scene Transitions**: PySceneDetect + xfade cinematic cuts.
- **Outro Clip Auto-Join**: Scales, pads, fps-matches and voice-clones promotional outros.
- **One-Click Download**: Automatically pulls and packages all final videos as a single zip archive.

## 🚀 Cloud Deployment
Can be deployed to **Hugging Face Spaces** (Docker), **Render**, **Koyeb**, or run locally with `./run.sh`.

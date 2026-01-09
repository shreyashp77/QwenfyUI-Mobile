
import { ComfyWorkflow, ThemeColor } from "./types";

export const THEME_OPTIONS: ThemeColor[] = [
  'purple', 'violet', 'fuchsia', 'pink', 'rose', 'red',
  'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
  'teal', 'cyan', 'sky', 'blue', 'indigo'
];


export const SAMPLER_OPTIONS = [
  "euler", "euler_ancestral", "heun", "heunpp2", "dpm_2", "dpm_2_ancestral",
  "lms", "dpm_fast", "dpm_adaptive", "dpmpp_2s_ancestral", "dpmpp_sde", "dpmpp_sde_gpu",
  "dpmpp_2m", "dpmpp_2m_sde", "dpmpp_2m_sde_gpu", "dpmpp_3m_sde", "dpmpp_3m_sde_gpu",
  "ddpm", "lcm", "ddim", "uni_pc", "uni_pc_bh2"
];

export const SCHEDULER_OPTIONS = [
  "normal", "karras", "exponential", "sgm_uniform", "simple", "ddim_uniform"
];

export interface Style {
  id: string;
  name: string;
  prompt: string;
  color: string;
}

export const STYLES: Style[] = [
  { id: 'none', name: 'None', prompt: '', color: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'cinematic', name: 'Cinematic', prompt: ', cinematic lighting, 8k, highly detailed, dramatic atmosphere', color: 'bg-gradient-to-br from-gray-800 to-black text-white' },
  { id: 'anime', name: 'Anime', prompt: ', anime style, vibrant colors, studio ghibli, makoto shinkai', color: 'bg-gradient-to-br from-pink-400 to-purple-500 text-white' },
  { id: 'photorealistic', name: 'Realism', prompt: ', photorealistic, 8k, raw photo, dslr, soft lighting', color: 'bg-gradient-to-br from-green-400 to-emerald-600 text-white' },
  { id: 'cyberpunk', name: 'Cyberpunk', prompt: ', cyberpunk, neon lights, futuristic, high tech, detailed', color: 'bg-gradient-to-br from-yellow-400 to-pink-600 text-white' },
  { id: 'watercolor', name: 'Watercolor', prompt: ', watercolor painting, artistic, soft edges, pastel colors', color: 'bg-gradient-to-br from-blue-300 to-purple-300 text-gray-800' },
  { id: '3d', name: '3D Render', prompt: ', 3d render, octane render, unreal engine 5, ray tracing', color: 'bg-gradient-to-br from-orange-400 to-red-500 text-white' },
  { id: 'vintage', name: 'Vintage', prompt: ', vintage style, retro, film grain, faded colors, 1980s', color: 'bg-gradient-to-br from-yellow-200 to-orange-300 text-gray-800' },
];

export const VIDEO_MODELS = {
  HIGH_NOISE: {
    STANDARD: "wan2.2_i2v_high_noise_14B_Q5_K_M.gguf",
    FAST: "wan2.2_i2v_high_noise_14B_Q4_K_M.gguf",
  },
  LOW_NOISE: {
    STANDARD: "wan2.2_i2v_low_noise_14B_Q5_K_M.gguf",
    FAST: "wan2.2_i2v_low_noise_14B_Q4_K_M.gguf",
  }
};

// NSFW mode uses safetensors models with UNETLoader instead of GGUF
export const VIDEO_MODELS_NSFW = {
  HIGH_NOISE: "Dasiwa_HighV81.safetensors",
  LOW_NOISE: "Dasiwa_LowV81.safetensors"
};

export const BASE_WORKFLOW: ComfyWorkflow = {
  "3": {
    "inputs": {
      "seed": 272656912429588,
      "steps": 4,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "simple",
      "denoise": 1,
      "model": [
        "102",
        0
      ],
      "positive": [
        "113",
        0
      ],
      "negative": [
        "114",
        0
      ],
      "latent_image": [
        "118",
        0
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "8": {
    "inputs": {
      "samples": [
        "3",
        0
      ],
      "vae": [
        "39",
        0
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "38": {
    "inputs": {
      "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
      "type": "qwen_image",
      "device": "default"
    },
    "class_type": "CLIPLoader",
    "_meta": {
      "title": "Load CLIP"
    }
  },
  "39": {
    "inputs": {
      "vae_name": "qwen_image_vae.safetensors"
    },
    "class_type": "VAELoader",
    "_meta": {
      "title": "Load VAE"
    }
  },
  "66": {
    "inputs": {
      "shift": 3,
      "model": [
        "129",
        0
      ]
    },
    "class_type": "ModelSamplingAuraFlow",
    "_meta": {
      "title": "ModelSamplingAuraFlow"
    }
  },
  "79": {
    "inputs": {
      "filename_prefix": "QwenfyUI_",
      "images": [
        "8",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  },
  "100": {
    "inputs": {
      "upscale_method": "lanczos",
      "megapixels": 1,
      "image": [
        "109",
        0
      ]
    },
    "class_type": "ImageScaleToTotalPixels",
    "_meta": {
      "title": "ImageScaleToTotalPixels"
    }
  },
  "102": {
    "inputs": {
      "strength": 1,
      "model": [
        "66",
        0
      ]
    },
    "class_type": "CFGNorm",
    "_meta": {
      "title": "CFGNorm"
    }
  },
  "109": {
    "inputs": {
      "image": "example.png"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "Load Image"
    }
  },
  "110": {
    "inputs": {
      "model_name": "svdq-fp4_r128-qwen-image-edit-2509-lightning-4steps-251115.safetensors",
      "cpu_offload": "enable",
      "num_blocks_on_gpu": 1,
      "use_pin_memory": "disable"
    },
    "class_type": "NunchakuQwenImageDiTLoader",
    "_meta": {
      "title": "Nunchaku Qwen-Image DiT Loader"
    }
  },
  "113": {
    "inputs": {
      "prompt": "placeholder",
      "clip": [
        "38",
        0
      ],
      "vae": [
        "39",
        0
      ],
      "image1": [
        "100",
        0
      ]
    },
    "class_type": "TextEncodeQwenImageEditPlus",
    "_meta": {
      "title": "TextEncodeQwenImageEditPlus"
    }
  },
  "114": {
    "inputs": {
      "prompt": "",
      "clip": [
        "38",
        0
      ],
      "vae": [
        "39",
        0
      ],
      "image1": [
        "100",
        0
      ]
    },
    "class_type": "TextEncodeQwenImageEditPlus",
    "_meta": {
      "title": "TextEncodeQwenImageEditPlus"
    }
  },
  "118": {
    "inputs": {
      "width": 720,
      "height": 1280,
      "batch_size": 1
    },
    "class_type": "EmptySD3LatentImage",
    "_meta": {
      "title": "EmptySD3LatentImage"
    }
  },
  "128": {
    "inputs": {
      "lora_name": "placeholder.safetensors",
      "strength_model": 0.6
    },
    "class_type": "LoraLoaderModelOnly",
    "_meta": {
      "title": "LoraLoaderModelOnly"
    }
  },
  "129": {
    "inputs": {
      "lora_count": 1,
      "cpu_offload": "enable",
      "lora_name_1": "None",
      "lora_strength_1": 1,
      "lora_name_2": "None",
      "lora_strength_2": 1,
      "lora_name_3": "None",
      "lora_strength_3": 1,
      "lora_name_4": "None",
      "lora_strength_4": 1,
      "lora_name_5": "None",
      "lora_strength_5": 1,
      "lora_name_6": "None",
      "lora_strength_6": 1,
      "lora_name_7": "None",
      "lora_strength_7": 1,
      "lora_name_8": "None",
      "lora_strength_8": 1,
      "lora_name_9": "None",
      "lora_strength_9": 1,
      "lora_name_10": "None",
      "lora_strength_10": 1,
      "model": [
        "110",
        0
      ]
    },
    "class_type": "NunchakuQwenImageLoraStack",
    "_meta": {
      "title": "Nunchaku Qwen Image LoRA Stack"
    }
  }
};

export const GENERATE_WORKFLOW: ComfyWorkflow = {
  "3": {
    "inputs": {
      "seed": 551697916057957,
      "steps": 9,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "simple",
      "denoise": 1,
      "model": [
        "16",
        0
      ],
      "positive": [
        "6",
        0
      ],
      "negative": [
        "7",
        0
      ],
      "latent_image": [
        "13",
        0
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "6": {
    "inputs": {
      "text": "placeholder",
      "clip": [
        "18",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Positive Prompt)"
    }
  },
  "7": {
    "inputs": {
      "text": "placeholder",
      "clip": [
        "18",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Negative Prompt)"
    }
  },
  "8": {
    "inputs": {
      "samples": [
        "3",
        0
      ],
      "vae": [
        "17",
        0
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "9": {
    "inputs": {
      "filename_prefix": "QwenfyUI_Gen_",
      "images": [
        "8",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  },
  "13": {
    "inputs": {
      "width": 720,
      "height": 1280,
      "batch_size": 1
    },
    "class_type": "EmptySD3LatentImage",
    "_meta": {
      "title": "EmptySD3LatentImage"
    }
  },
  "16": {
    "inputs": {
      "unet_name": "z_image_turbo_bf16.safetensors",
      "weight_dtype": "default"
    },
    "class_type": "UNETLoader",
    "_meta": {
      "title": "Load Diffusion Model"
    }
  },
  "17": {
    "inputs": {
      "vae_name": "ae.safetensors"
    },
    "class_type": "VAELoader",
    "_meta": {
      "title": "Load VAE"
    }
  },
  "18": {
    "inputs": {
      "clip_name": "qwen_3_4b.safetensors",
      "type": "qwen_image",
      "device": "cpu"
    },
    "class_type": "CLIPLoader",
    "_meta": {
      "title": "Load CLIP"
    }
  }
};


export const VIDEO_RESOLUTIONS = [
  { id: 'auto', width: 0, height: 0, label: 'Auto (Match Source)' },
  { id: '480x832', width: 480, height: 832, label: '480x832 (9:16)' },
  { id: '720x1280', width: 720, height: 1280, label: '720x1280 (9:16)' },
  { id: '540x960', width: 540, height: 960, label: '540x960 (9:16)' },
  { id: '360x640', width: 360, height: 640, label: '360x640 (9:16)' },
];

export const VIDEO_WORKFLOW: ComfyWorkflow = {
  "6": {
    "inputs": {
      "text": "make her dance",
      "clip": [
        "38",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Positive Prompt)"
    }
  },
  "7": {
    "inputs": {
      "text": "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走",
      "clip": [
        "38",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Negative Prompt)"
    }
  },
  "8": {
    "inputs": {
      "samples": [
        "58",
        0
      ],
      "vae": [
        "39",
        0
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "38": {
    "inputs": {
      "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
      "type": "wan",
      "device": "default"
    },
    "class_type": "CLIPLoader",
    "_meta": {
      "title": "Load CLIP"
    }
  },
  "39": {
    "inputs": {
      "vae_name": "wan_2.1_vae.safetensors"
    },
    "class_type": "VAELoader",
    "_meta": {
      "title": "Load VAE"
    }
  },
  "50": {
    "inputs": {
      "width": 480,
      "height": 832,
      "length": 49,
      "batch_size": 1,
      "positive": [
        "6",
        0
      ],
      "negative": [
        "7",
        0
      ],
      "vae": [
        "39",
        0
      ],
      "start_image": [
        "52",
        0
      ]
    },
    "class_type": "WanImageToVideo",
    "_meta": {
      "title": "WanImageToVideo"
    }
  },
  "52": {
    "inputs": {
      "image": "image (14).png"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "Load Image"
    }
  },
  "57": {
    "inputs": {
      "add_noise": "enable",
      "noise_seed": 827371825446053,
      "steps": 4,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "simple",
      "start_at_step": 0,
      "end_at_step": 2,
      "return_with_leftover_noise": "enable",
      "model": [
        "67",
        0
      ],
      "positive": [
        "50",
        0
      ],
      "negative": [
        "50",
        1
      ],
      "latent_image": [
        "50",
        2
      ]
    },
    "class_type": "KSamplerAdvanced",
    "_meta": {
      "title": "KSampler (Advanced)"
    }
  },
  "58": {
    "inputs": {
      "add_noise": "disable",
      "noise_seed": 0,
      "steps": 4,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "simple",
      "start_at_step": 2,
      "end_at_step": 1000,
      "return_with_leftover_noise": "disable",
      "model": [
        "68",
        0
      ],
      "positive": [
        "50",
        0
      ],
      "negative": [
        "50",
        1
      ],
      "latent_image": [
        "57",
        0
      ]
    },
    "class_type": "KSamplerAdvanced",
    "_meta": {
      "title": "KSampler (Advanced)"
    }
  },
  "61": {
    "inputs": {
      "unet_name": VIDEO_MODELS.HIGH_NOISE.STANDARD
    },
    "class_type": "UnetLoaderGGUF",
    "_meta": {
      "title": "Unet Loader (GGUF)"
    }
  },
  "62": {
    "inputs": {
      "unet_name": VIDEO_MODELS.LOW_NOISE.STANDARD
    },
    "class_type": "UnetLoaderGGUF",
    "_meta": {
      "title": "Unet Loader (GGUF)"
    }
  },
  "63": {
    "inputs": {
      "frame_rate": 16,
      "loop_count": 0,
      "filename_prefix": "wan22",
      "format": "video/h264-mp4",
      "pix_fmt": "yuv420p",
      "crf": 15,
      "save_metadata": true,
      "trim_to_audio": false,
      "pingpong": false,
      "save_output": true,
      "images": [
        "8",
        0
      ]
    },
    "class_type": "VHS_VideoCombine",
    "_meta": {
      "title": "Video Combine 🎥🅥🅗🅢"
    }
  },
  "64": {
    "inputs": {
      "lora_name": "wan2.2-i2v-high_noise_model.safetensors",
      "strength_model": 1,
      "model": [
        "61",
        0
      ]
    },
    "class_type": "LoraLoaderModelOnly",
    "_meta": {
      "title": "LoraLoaderModelOnly"
    }
  },
  "66": {
    "inputs": {
      "lora_name": "wan2.2-i2v-low_noise_model.safetensors",
      "strength_model": 1,
      "model": [
        "62",
        0
      ]
    },
    "class_type": "LoraLoaderModelOnly",
    "_meta": {
      "title": "LoraLoaderModelOnly"
    }
  },
  "67": {
    "inputs": {
      "shift": 8.000000000000002,
      "model": [
        "64",
        0
      ]
    },
    "class_type": "ModelSamplingSD3",
    "_meta": {
      "title": "ModelSamplingSD3"
    }
  },
  "68": {
    "inputs": {
      "shift": 8.000000000000002,
      "model": [
        "66",
        0
      ]
    },
    "class_type": "ModelSamplingSD3",
    "_meta": {
      "title": "ModelSamplingSD3"
    }
  },
  "82": {
    "inputs": {
      "frame_rate": 24,
      "loop_count": 0,
      "filename_prefix": "wan22",
      "format": "video/h264-mp4",
      "pix_fmt": "yuv420p",
      "crf": 15,
      "save_metadata": true,
      "trim_to_audio": false,
      "pingpong": false,
      "save_output": true,
      "images": [
        "83",
        0
      ]
    },
    "class_type": "VHS_VideoCombine",
    "_meta": {
      "title": "Video Combine 🎥🅥🅗🅢"
    }
  },
  "83": {
    "inputs": {
      "ckpt_name": "rife47.pth",
      "clear_cache_after_n_frames": 10,
      "multiplier": 2,
      "fast_mode": false,
      "ensemble": true,
      "scale_factor": 1,
      "frames": [
        "8",
        0
      ]
    },
    "class_type": "RIFE VFI",
    "_meta": {
      "title": "RIFE VFI (recommend rife47 and rife49)"
    }
  }
};

// VIDEO_EXTEND_WORKFLOW: Loads an existing video, extracts last frame, generates new video
// This is identical to VIDEO_WORKFLOW but replaces LoadImage with VHS_LoadVideo
export const VIDEO_EXTEND_WORKFLOW: ComfyWorkflow = {
  "6": {
    "inputs": {
      "text": "make her dance",
      "clip": [
        "38",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Positive Prompt)"
    }
  },
  "7": {
    "inputs": {
      "text": "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走",
      "clip": [
        "38",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Negative Prompt)"
    }
  },
  "8": {
    "inputs": {
      "samples": [
        "58",
        0
      ],
      "vae": [
        "39",
        0
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "38": {
    "inputs": {
      "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
      "type": "wan",
      "device": "default"
    },
    "class_type": "CLIPLoader",
    "_meta": {
      "title": "Load CLIP"
    }
  },
  "39": {
    "inputs": {
      "vae_name": "wan_2.1_vae.safetensors"
    },
    "class_type": "VAELoader",
    "_meta": {
      "title": "Load VAE"
    }
  },
  "50": {
    "inputs": {
      "width": 480,
      "height": 832,
      "length": 49,
      "batch_size": 1,
      "positive": [
        "6",
        0
      ],
      "negative": [
        "7",
        0
      ],
      "vae": [
        "39",
        0
      ],
      "start_image": [
        "90",
        0
      ]
    },
    "class_type": "WanImageToVideo",
    "_meta": {
      "title": "WanImageToVideo"
    }
  },
  "57": {
    "inputs": {
      "add_noise": "enable",
      "noise_seed": 827371825446053,
      "steps": 4,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "simple",
      "start_at_step": 0,
      "end_at_step": 2,
      "return_with_leftover_noise": "enable",
      "model": [
        "67",
        0
      ],
      "positive": [
        "50",
        0
      ],
      "negative": [
        "50",
        1
      ],
      "latent_image": [
        "50",
        2
      ]
    },
    "class_type": "KSamplerAdvanced",
    "_meta": {
      "title": "KSampler (Advanced)"
    }
  },
  "58": {
    "inputs": {
      "add_noise": "disable",
      "noise_seed": 0,
      "steps": 4,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "simple",
      "start_at_step": 2,
      "end_at_step": 1000,
      "return_with_leftover_noise": "disable",
      "model": [
        "68",
        0
      ],
      "positive": [
        "50",
        0
      ],
      "negative": [
        "50",
        1
      ],
      "latent_image": [
        "57",
        0
      ]
    },
    "class_type": "KSamplerAdvanced",
    "_meta": {
      "title": "KSampler (Advanced)"
    }
  },
  "61": {
    "inputs": {
      "unet_name": VIDEO_MODELS.HIGH_NOISE.STANDARD
    },
    "class_type": "UnetLoaderGGUF",
    "_meta": {
      "title": "Unet Loader (GGUF)"
    }
  },
  "62": {
    "inputs": {
      "unet_name": VIDEO_MODELS.LOW_NOISE.STANDARD
    },
    "class_type": "UnetLoaderGGUF",
    "_meta": {
      "title": "Unet Loader (GGUF)"
    }
  },
  "63": {
    "inputs": {
      "frame_rate": 16,
      "loop_count": 0,
      "filename_prefix": "wan22_ext",
      "format": "video/h264-mp4",
      "pix_fmt": "yuv420p",
      "crf": 15,
      "save_metadata": true,
      "trim_to_audio": false,
      "pingpong": false,
      "save_output": true,
      "images": [
        "8",
        0
      ]
    },
    "class_type": "VHS_VideoCombine",
    "_meta": {
      "title": "Video Combine 🎥🅥🅗🅢"
    }
  },
  "64": {
    "inputs": {
      "lora_name": "wan2.2-i2v-high_noise_model.safetensors",
      "strength_model": 1,
      "model": [
        "61",
        0
      ]
    },
    "class_type": "LoraLoaderModelOnly",
    "_meta": {
      "title": "LoraLoaderModelOnly"
    }
  },
  "66": {
    "inputs": {
      "lora_name": "wan2.2-i2v-low_noise_model.safetensors",
      "strength_model": 1,
      "model": [
        "62",
        0
      ]
    },
    "class_type": "LoraLoaderModelOnly",
    "_meta": {
      "title": "LoraLoaderModelOnly"
    }
  },
  "67": {
    "inputs": {
      "shift": 8.000000000000002,
      "model": [
        "64",
        0
      ]
    },
    "class_type": "ModelSamplingSD3",
    "_meta": {
      "title": "ModelSamplingSD3"
    }
  },
  "68": {
    "inputs": {
      "shift": 8.000000000000002,
      "model": [
        "66",
        0
      ]
    },
    "class_type": "ModelSamplingSD3",
    "_meta": {
      "title": "ModelSamplingSD3"
    }
  },
  // VHS_LoadVideo - Load video from ComfyUI (output folder)
  // Uses video filename and type like LoadImage node
  "89": {
    "inputs": {
      "video": "placeholder.mp4",
      "force_rate": 0,
      "force_size": "Disabled",
      "custom_width": 480,
      "custom_height": 832,
      "frame_load_cap": 0,
      "skip_first_frames": 0,
      "select_every_nth": 1
    },
    "class_type": "VHS_LoadVideo",
    "_meta": {
      "title": "Load Video 🎥🅥🅗🅢"
    }
  },
  // ImageFromBatch - Extract the last frame from the video
  // Using batch_index 4095 (max allowed) will effectively get the last frame
  // since ComfyUI clamps the index to the actual frame count
  "90": {
    "inputs": {
      "batch_index": 4095,
      "length": 1,
      "image": [
        "89",
        0
      ]
    },
    "class_type": "ImageFromBatch",
    "_meta": {
      "title": "Get Last Frame"
    }
  }
};

// VIDEO_EXTEND_CONCAT_WORKFLOW: Loads original video, generates extension, merges into single video
// Key nodes:
// - Node 89: VHS_LoadVideoPath - Load original video (all frames)
// - Node 90: ImageFromBatch - Extract last frame for generation input
// - Node 91: VHS_MergeImages - Merge original frames + new frames
// - Node 63: VHS_VideoCombine - Output final merged video
export const VIDEO_EXTEND_CONCAT_WORKFLOW: ComfyWorkflow = {
  "6": {
    "inputs": {
      "text": "make her dance",
      "clip": [
        "38",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Positive Prompt)"
    }
  },
  "7": {
    "inputs": {
      "text": "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走",
      "clip": [
        "38",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Negative Prompt)"
    }
  },
  "8": {
    "inputs": {
      "samples": [
        "58",
        0
      ],
      "vae": [
        "39",
        0
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "38": {
    "inputs": {
      "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
      "type": "wan",
      "device": "default"
    },
    "class_type": "CLIPLoader",
    "_meta": {
      "title": "Load CLIP"
    }
  },
  "39": {
    "inputs": {
      "vae_name": "wan_2.1_vae.safetensors"
    },
    "class_type": "VAELoader",
    "_meta": {
      "title": "Load VAE"
    }
  },
  "50": {
    "inputs": {
      "width": 480,
      "height": 832,
      "length": 49,
      "batch_size": 1,
      "positive": [
        "6",
        0
      ],
      "negative": [
        "7",
        0
      ],
      "vae": [
        "39",
        0
      ],
      "start_image": [
        "90",
        0
      ]
    },
    "class_type": "WanImageToVideo",
    "_meta": {
      "title": "WanImageToVideo"
    }
  },
  "57": {
    "inputs": {
      "add_noise": "enable",
      "noise_seed": 827371825446053,
      "steps": 4,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "simple",
      "start_at_step": 0,
      "end_at_step": 2,
      "return_with_leftover_noise": "enable",
      "model": [
        "67",
        0
      ],
      "positive": [
        "50",
        0
      ],
      "negative": [
        "50",
        1
      ],
      "latent_image": [
        "50",
        2
      ]
    },
    "class_type": "KSamplerAdvanced",
    "_meta": {
      "title": "KSampler (Advanced)"
    }
  },
  "58": {
    "inputs": {
      "add_noise": "disable",
      "noise_seed": 0,
      "steps": 4,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "simple",
      "start_at_step": 2,
      "end_at_step": 1000,
      "return_with_leftover_noise": "disable",
      "model": [
        "68",
        0
      ],
      "positive": [
        "50",
        0
      ],
      "negative": [
        "50",
        1
      ],
      "latent_image": [
        "57",
        0
      ]
    },
    "class_type": "KSamplerAdvanced",
    "_meta": {
      "title": "KSampler (Advanced)"
    }
  },
  "61": {
    "inputs": {
      "unet_name": VIDEO_MODELS.HIGH_NOISE.STANDARD
    },
    "class_type": "UnetLoaderGGUF",
    "_meta": {
      "title": "Unet Loader (GGUF)"
    }
  },
  "62": {
    "inputs": {
      "unet_name": VIDEO_MODELS.LOW_NOISE.STANDARD
    },
    "class_type": "UnetLoaderGGUF",
    "_meta": {
      "title": "Unet Loader (GGUF)"
    }
  },
  // VHS_VideoCombine - Output the merged video
  // Takes merged frames from node 91
  "63": {
    "inputs": {
      "frame_rate": 16,
      "loop_count": 0,
      "filename_prefix": "wan22_extended",
      "format": "video/h264-mp4",
      "pix_fmt": "yuv420p",
      "crf": 15,
      "save_metadata": true,
      "trim_to_audio": false,
      "pingpong": false,
      "save_output": true,
      "images": [
        "91",
        0
      ]
    },
    "class_type": "VHS_VideoCombine",
    "_meta": {
      "title": "Video Combine (Merged) 🎥🅥🅗🅢"
    }
  },
  "64": {
    "inputs": {
      "lora_name": "wan2.2-i2v-high_noise_model.safetensors",
      "strength_model": 1,
      "model": [
        "61",
        0
      ]
    },
    "class_type": "LoraLoaderModelOnly",
    "_meta": {
      "title": "LoraLoaderModelOnly"
    }
  },
  "66": {
    "inputs": {
      "lora_name": "wan2.2-i2v-low_noise_model.safetensors",
      "strength_model": 1,
      "model": [
        "62",
        0
      ]
    },
    "class_type": "LoraLoaderModelOnly",
    "_meta": {
      "title": "LoraLoaderModelOnly"
    }
  },
  "67": {
    "inputs": {
      "shift": 8.000000000000002,
      "model": [
        "64",
        0
      ]
    },
    "class_type": "ModelSamplingSD3",
    "_meta": {
      "title": "ModelSamplingSD3"
    }
  },
  "68": {
    "inputs": {
      "shift": 8.000000000000002,
      "model": [
        "66",
        0
      ]
    },
    "class_type": "ModelSamplingSD3",
    "_meta": {
      "title": "ModelSamplingSD3"
    }
  },
  // VHS_LoadVideo - Load original video to get all frames
  // Uses video filename like LoadImage node
  "89": {
    "inputs": {
      "video": "placeholder.mp4",
      "force_rate": 16,
      "force_size": "Disabled",
      "custom_width": 480,
      "custom_height": 832,
      "frame_load_cap": 0,
      "skip_first_frames": 0,
      "select_every_nth": 1
    },
    "class_type": "VHS_LoadVideo",
    "_meta": {
      "title": "Load Original Video 🎥🅥🅗🅢"
    }
  },
  // ImageFromBatch - Extract the last frame for generation input
  "90": {
    "inputs": {
      "batch_index": 4095,
      "length": 1,
      "image": [
        "89",
        0
      ]
    },
    "class_type": "ImageFromBatch",
    "_meta": {
      "title": "Get Last Frame"
    }
  },
  // ImageBatch - Concatenate original frames + newly generated frames
  // This node appends image_B after image_A along the batch dimension (temporal concatenation)
  "91": {
    "inputs": {
      "image1": [
        "89",
        0
      ],
      "image2": [
        "8",
        0
      ]
    },
    "class_type": "ImageBatch",
    "_meta": {
      "title": "Concatenate Frames"
    }
  }
};

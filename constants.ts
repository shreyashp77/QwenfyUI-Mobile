import { ComfyWorkflow } from "./types";

export const BASE_WORKFLOW: ComfyWorkflow = {
  "3": {
    "inputs": {
      "seed": 109793115954832,
      "steps": 4,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "simple",
      "denoise": 1,
      "model": [
        "75",
        0
      ],
      "positive": [
        "111",
        0
      ],
      "negative": [
        "110",
        0
      ],
      "latent_image": [
        "88",
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
  "37": {
    "inputs": {
      "unet_name": "placeholder_diffusion_fp8.safetensors",
      "weight_dtype": "default"
    },
    "class_type": "UNETLoader",
    "_meta": {
      "title": "Load Diffusion Model"
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
  "60": {
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
  "66": {
    "inputs": {
      "shift": 3,
      "model": [
        "391",
        0
      ]
    },
    "class_type": "ModelSamplingAuraFlow",
    "_meta": {
      "title": "ModelSamplingAuraFlow"
    }
  },
  "75": {
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
  "78": {
    "inputs": {
      "image": "scaled_975.png"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "Load Image"
    }
  },
  "88": {
    "inputs": {
      "pixels": [
        "93",
        0
      ],
      "vae": [
        "39",
        0
      ]
    },
    "class_type": "VAEEncode",
    "_meta": {
      "title": "VAE Encode"
    }
  },
  "89": {
    "inputs": {
      "lora_name": "Qwen-Image-Edit-2509-Lightning-4steps-V1.0-bf16.safetensors",
      "strength_model": 1,
      "model": [
        "389",
        0
      ]
    },
    "class_type": "LoraLoaderModelOnly",
    "_meta": {
      "title": "LoraLoaderModelOnly"
    }
  },
  "93": {
    "inputs": {
      "upscale_method": "lanczos",
      "megapixels": 1,
      "image": [
        "78",
        0
      ]
    },
    "class_type": "ImageScaleToTotalPixels",
    "_meta": {
      "title": "Scale Image to Total Pixels"
    }
  },
  "110": {
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
        "93",
        0
      ]
    },
    "class_type": "TextEncodeQwenImageEditPlus",
    "_meta": {
      "title": "TextEncodeQwenImageEditPlus"
    }
  },
  "111": {
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
        "93",
        0
      ]
    },
    "class_type": "TextEncodeQwenImageEditPlus",
    "_meta": {
      "title": "TextEncodeQwenImageEditPlus"
    }
  },
  "389": {
    "inputs": {
      "unet_name": "placeholder_model_Q5_1.gguf"
    },
    "class_type": "UnetLoaderGGUF",
    "_meta": {
      "title": "Unet Loader (GGUF)"
    }
  },
  "390": {
    "inputs": {
      "lora_name": "placeholder_detail_lora.safetensors",
      "strength_model": 0.8,
      "model": [
        "89",
        0
      ]
    },
    "class_type": "LoraLoaderModelOnly",
    "_meta": {
      "title": "LoraLoaderModelOnly"
    }
  },
  "391": {
    "inputs": {
      "lora_name": "placeholder_style_lora.safetensors",
      "strength_model": 1,
      "model": [
        "390",
        0
      ]
    },
    "class_type": "LoraLoaderModelOnly",
    "_meta": {
      "title": "LoraLoaderModelOnly"
    }
  }
};
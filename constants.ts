import { ComfyWorkflow } from "./types";

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
      "cpu_offload": "auto",
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
      "cpu_offload": "disable",
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
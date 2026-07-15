import type { ProviderConfig } from '../../shared/types'
import { OpenAIResponsesClient } from './openAIResponsesClient'

const IMAGE_PROMPT_OPTIMIZER_INSTRUCTION = [
  '你是图像生成提示词编辑器。',
  '你的任务是适度澄清和润色用户提示词，让图像生成模型更容易理解用户意图。',
  '不要改变用户意图，不要替用户新增无关主题，不要把简单需求扩写成夸张复杂的大段描述。',
  '当用户关键词抽象或模糊时，只补充必要的主体、画面重点、风格方向、构图或质感信息。',
  '当用户提示词已经明确时，只做轻量整理，让表达更清楚、更适合图像模型执行。',
  '不要过度扩写，不要堆砌华丽形容词，不要加入用户没有暗示的品牌、场景、人物、文字或用途。',
  '输出应保持简洁自然，通常一段话即可，可以保留用户原有关键词。',
  '不要解释，不要列清单，不要加标题，不要输出多个版本，只输出最终优化后的提示词。'
].join('\n')

export class PromptOptimizeService {
  constructor(private readonly responses = new OpenAIResponsesClient()) {}

  async optimize(provider: ProviderConfig, apiKey: string, prompt: string): Promise<string> {
    if (!provider.promptModel.trim()) {
      return prompt
    }

    return this.responses.createText(provider, apiKey, [
      {
        role: 'system',
        content: IMAGE_PROMPT_OPTIMIZER_INSTRUCTION
      },
      {
        role: 'user',
        content: prompt
      }
    ])
  }
}

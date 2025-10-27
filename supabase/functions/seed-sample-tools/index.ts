import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getUserFromAuth, requireAdmin } from '../_shared/requireAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sample tools based on what's available in Asia
const SAMPLE_TOOLS = [
  {
    name: "Vertex AI",
    description: "Google's comprehensive suite of AI tools for creating, training, and deploying machine learning models. Covering everything from data preparation to model assessment and implementation.",
    url: "https://cloud.google.com/vertex-ai",
    category: "Machine Learning Platform",
  },
  {
    name: "JetBrains Junie",
    description: "An innovative AI coding assistant that works inside JetBrains IDEs to streamline programming efforts and boost efficiency through automated code writing and testing.",
    url: "https://www.jetbrains.com/junie/",
    category: "Developer Tools",
  },
  {
    name: "Google AI Studio",
    description: "A platform for prototyping and experimenting with Google's Gemini AI models through an intuitive interface.",
    url: "https://aistudio.google.com/",
    category: "AI Development",
  },
  {
    name: "Alibaba Cloud Machine Learning",
    description: "Comprehensive machine learning platform from Alibaba Cloud offering end-to-end AI solutions for businesses across Asia.",
    url: "https://www.alibabacloud.com/product/machine-learning",
    category: "Machine Learning Platform",
  },
  {
    name: "Baidu AI",
    description: "China's leading AI platform offering speech recognition, natural language processing, computer vision, and deep learning capabilities.",
    url: "https://ai.baidu.com/",
    category: "AI Platform",
  },
  {
    name: "Tencent AI Lab",
    description: "Advanced AI research and development platform from Tencent, covering computer vision, NLP, speech recognition, and machine learning.",
    url: "https://ai.tencent.com/",
    category: "AI Research",
  },
  {
    name: "LINE CLOVA",
    description: "AI platform from LINE Corporation providing voice recognition, natural language processing, and computer vision services.",
    url: "https://clova.line.me/",
    category: "AI Platform",
  },
  {
    name: "Naver Papago",
    description: "AI-powered translation service supporting multiple Asian languages with neural machine translation technology.",
    url: "https://papago.naver.com/",
    category: "Translation",
  },
  {
    name: "Samsung Bixby",
    description: "Samsung's AI assistant platform integrating voice control, vision recognition, and contextual awareness.",
    url: "https://www.samsung.com/us/explore/bixby/",
    category: "AI Assistant",
  },
  {
    name: "Sony Neural Network Libraries",
    description: "Deep learning framework from Sony for research and development of AI applications.",
    url: "https://nnabla.org/",
    category: "Deep Learning",
  },
  {
    name: "Huawei ModelArts",
    description: "AI development platform providing one-stop AI development services from data preparation to model deployment.",
    url: "https://www.huaweicloud.com/intl/en-us/product/modelarts.html",
    category: "AI Development",
  },
  {
    name: "SenseTime",
    description: "Leading AI company specializing in computer vision and deep learning, providing face recognition and image analysis.",
    url: "https://www.sensetime.com/",
    category: "Computer Vision",
  },
  {
    name: "iFLYTEK",
    description: "Chinese AI company specializing in speech recognition, natural language processing, and voice synthesis.",
    url: "https://www.iflytek.com/en/",
    category: "Speech AI",
  },
  {
    name: "Megvii Face++",
    description: "Computer vision platform providing facial recognition, image recognition, and intelligent video analysis.",
    url: "https://www.faceplusplus.com/",
    category: "Computer Vision",
  },
  {
    name: "Kakao i",
    description: "Kakao's AI platform offering speech recognition, natural language processing, and recommendation systems.",
    url: "https://kakao.ai/",
    category: "AI Platform",
  },
  {
    name: "ABEJA Platform",
    description: "Japanese AI platform for developing and deploying deep learning models in enterprise environments.",
    url: "https://www.abejainc.com/",
    category: "Enterprise AI",
  },
  {
    name: "Preferred Networks",
    description: "Japanese AI company developing deep learning technologies for robotics, manufacturing, and healthcare.",
    url: "https://www.preferred.jp/en/",
    category: "Deep Learning",
  },
  {
    name: "NTT AI",
    description: "NTT's comprehensive AI solutions including natural language processing, image recognition, and data analytics.",
    url: "https://www.global.ntt/en/services/ai.html",
    category: "AI Solutions",
  },
  {
    name: "Rakuten AI",
    description: "AI platform from Rakuten providing personalization, recommendation, and customer analytics solutions.",
    url: "https://rakuten.ai/",
    category: "AI Platform",
  },
  {
    name: "Grab AI",
    description: "Southeast Asia's superapp using AI for ride-hailing optimization, delivery routing, and financial services.",
    url: "https://www.grab.com/sg/",
    category: "Applied AI",
  },
  {
    name: "Grab AI",
    description: "Southeast Asia's superapp using AI for ride-hailing optimization, delivery routing, and financial services.",
    url: "https://www.grab.com/sg/",
    category: "Applied AI",
  },
  {
    name: "Sea AI Lab",
    description: "AI research division of Sea Group focusing on recommendation systems, NLP, and computer vision.",
    url: "https://www.sea.com/",
    category: "AI Research",
  },
  {
    name: "Gojek AI",
    description: "Indonesian superapp leveraging AI for transportation, food delivery, and digital payment optimization.",
    url: "https://www.gojek.com/",
    category: "Applied AI",
  },
  {
    name: "ByteDance AI Lab",
    description: "AI research and development from ByteDance, covering recommendation algorithms, NLP, and computer vision.",
    url: "https://www.bytedance.com/en/",
    category: "AI Research",
  },
  {
    name: "Xiaomi AI",
    description: "Xiaomi's AI platform powering smart home devices, voice assistants, and IoT ecosystem.",
    url: "https://www.mi.com/global/",
    category: "IoT AI",
  },
  {
    name: "Pinduoduo AI",
    description: "E-commerce AI platform using machine learning for product recommendations and agricultural technology.",
    url: "https://www.pinduoduo.com/",
    category: "E-commerce AI",
  }
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    const user = await getUserFromAuth(supabase, authHeader);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    await requireAdmin(supabase, user.id);

    console.log('Seeding sample AI tools...');
    
    let insertedCount = 0;
    let skippedCount = 0;

    for (const tool of SAMPLE_TOOLS) {
      try {
        // Check if tool exists
        const { data: existing } = await supabase
          .from('ai_tools')
          .select('id')
          .eq('name', tool.name)
          .maybeSingle();

        if (existing) {
          console.log(`Tool already exists: ${tool.name}`);
          skippedCount++;
          continue;
        }

        // Insert new tool
        const { error: insertError } = await supabase
          .from('ai_tools')
          .insert({
            ...tool,
            source_urls: ['seed']
          });

        if (insertError) {
          console.error(`Error inserting tool ${tool.name}:`, insertError);
          skippedCount++;
        } else {
          console.log(`Inserted tool: ${tool.name}`);
          insertedCount++;
        }
      } catch (error) {
        console.error(`Error processing tool ${tool.name}:`, error);
        skippedCount++;
      }
    }

    console.log(`Seeding complete. Inserted: ${insertedCount}, Skipped: ${skippedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sample tools seeded',
        stats: {
          inserted: insertedCount,
          skipped: skippedCount,
          total: SAMPLE_TOOLS.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in seed-sample-tools function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
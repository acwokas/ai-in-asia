import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Author pools by region
const AUTHORS = {
  singapore: [
    { name: 'Wei Ming', handle: 'sgTechDad' },
    { name: 'Priya Sharma', handle: 'sg_priya_ai' },
    { name: 'Adrian Tan', handle: 'adrianSG' },
    { name: 'Michelle Goh', handle: 'michelleG_tech' },
    { name: 'Raj Kumar', handle: 'raj_sg_dev' },
    { name: 'Sarah Lee', handle: 'sarahlee88' },
    { name: 'Kevin Wong', handle: 'kwong_sg' },
    { name: 'Jasmine Koh', handle: 'jkoh_tech' },
    { name: 'Marcus Lim', handle: 'mlim_ai' },
    { name: 'Natasha Chen', handle: 'natashaC' },
    { name: 'Benjamin Ng', handle: 'benNG_dev' },
    { name: 'Crystal Tan', handle: 'crystaltan' },
    { name: 'Daniel Yeo', handle: 'dyeo_sg' },
    { name: 'Emily Ong', handle: 'emilyO_ai' },
    { name: 'Felix Tay', handle: 'felixtay' },
    { name: 'Grace Lim', handle: 'gracelim_sg' },
    { name: 'Henry Chua', handle: 'hchua_tech' },
    { name: 'Iris Tan', handle: 'iris_sg' },
    { name: 'Jason Goh', handle: 'jasongoh88' },
    { name: 'Karen Lee', handle: 'karenlee_ai' },
  ],
  india: [
    { name: 'Lakshmi Reddy', handle: 'lakshmi_r' },
    { name: 'Arjun Patel', handle: 'arjun_p_dev' },
    { name: 'Priya Desai', handle: 'priya_d_ai' },
    { name: 'Rohan Kumar', handle: 'rohan_tech' },
    { name: 'Sneha Iyer', handle: 'sneha_i' },
    { name: 'Vikram Singh', handle: 'vikram_s_ai' },
    { name: 'Ananya Sharma', handle: 'ananya_sh' },
    { name: 'Aditya Gupta', handle: 'aditya_g_dev' },
    { name: 'Kavya Nair', handle: 'kavya_n' },
    { name: 'Rahul Mehta', handle: 'rahul_m_tech' },
    { name: 'Pooja Verma', handle: 'pooja_v_ai' },
    { name: 'Karthik Rao', handle: 'karthik_r' },
    { name: 'Divya Joshi', handle: 'divya_j_dev' },
    { name: 'Sanjay Pillai', handle: 'sanjay_p' },
    { name: 'Meera Reddy', handle: 'meera_r_ai' },
  ],
  philippines: [
    { name: 'Miguel Santos', handle: 'ph_dev_migs' },
    { name: 'Maria Reyes', handle: 'maria_r_ph' },
    { name: 'Jose Cruz', handle: 'jose_cruz_dev' },
    { name: 'Ana Lopez', handle: 'ana_l_tech' },
    { name: 'Carlo Ramos', handle: 'carlo_r_ph' },
    { name: 'Sofia Garcia', handle: 'sofia_g_ai' },
    { name: 'Diego Fernandez', handle: 'diego_f_ph' },
    { name: 'Isabella Mendoza', handle: 'bella_m_dev' },
    { name: 'Luis Torres', handle: 'luis_t_ph' },
    { name: 'Carmen Santos', handle: 'carmen_s_ai' },
  ],
  china_hk: [
    { name: 'Li Wei', handle: 'liwei_hk' },
    { name: 'Chen Ming', handle: 'chen_m_ai' },
    { name: 'Zhang Yue', handle: 'zhang_y_dev' },
    { name: 'Wang Lei', handle: 'wanglei_tech' },
    { name: 'Liu Jing', handle: 'liu_j_hk' },
    { name: 'Zhao Hua', handle: 'zhao_h_ai' },
    { name: 'Yang Fei', handle: 'yang_f_dev' },
    { name: 'Wu Ling', handle: 'wu_l_hk' },
    { name: 'Huang Xin', handle: 'huang_x_tech' },
    { name: 'Zhou Mei', handle: 'zhou_m_ai' },
  ],
  west: [
    { name: 'John Smith', handle: 'jsmith_ai' },
    { name: 'Emma Johnson', handle: 'emma_j_tech' },
    { name: 'Michael Brown', handle: 'mbrown_dev' },
    { name: 'Sarah Williams', handle: 'sarah_w_ai' },
    { name: 'David Miller', handle: 'dmiller_tech' },
    { name: 'Laura Davis', handle: 'laura_d_dev' },
    { name: 'James Wilson', handle: 'jwilson_ai' },
    { name: 'Sophie Taylor', handle: 'sophie_t' },
    { name: 'Robert Moore', handle: 'rmoore_tech' },
    { name: 'Emily Anderson', handle: 'emily_a_ai' },
    { name: 'Thomas Martin', handle: 'tmartin_dev' },
    { name: 'Olivia White', handle: 'olivia_w_tech' },
    { name: 'Daniel Harris', handle: 'dharris_ai' },
    { name: 'Jessica Clark', handle: 'jclark_dev' },
    { name: 'Matthew Lewis', handle: 'mlewis_tech' },
  ],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if authors already exist
    const { data: existingAuthors } = await supabase
      .from('ai_comment_authors')
      .select('id')
      .limit(1);

    if (existingAuthors && existingAuthors.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Authors already seeded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate avatar URLs using UI Avatars
    const generateAvatarUrl = (name: string, handle: string, isPowerUser: boolean) => {
      if (isPowerUser) {
        // Power users get colorful avatar images from DiceBear (fun, not realistic)
        const seed = handle;
        return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
      }
      // Regular users get initial avatars 80% of the time
      if (Math.random() < 0.8) {
        const initials = name.split(' ').map(n => n[0]).join('');
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&size=200`;
      }
      return null; // 20% have no avatar
    };

    const authorsToInsert = [];
    
    // Select 20 power users randomly across regions
    const allAuthors = Object.entries(AUTHORS).flatMap(([region, authors]) =>
      authors.map(author => ({ ...author, region }))
    );
    
    const powerUserIndices = new Set();
    while (powerUserIndices.size < 20) {
      powerUserIndices.add(Math.floor(Math.random() * allAuthors.length));
    }

    let index = 0;
    for (const [region, authors] of Object.entries(AUTHORS)) {
      for (const author of authors) {
        const isPowerUser = powerUserIndices.has(index);
        authorsToInsert.push({
          name: author.name,
          handle: author.handle,
          avatar_url: generateAvatarUrl(author.name, author.handle, isPowerUser),
          region,
          is_power_user: isPowerUser,
        });
        index++;
      }
    }

    // Insert all authors
    const { error: insertError } = await supabase
      .from('ai_comment_authors')
      .insert(authorsToInsert);

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        message: 'Successfully seeded AI comment authors',
        count: authorsToInsert.length,
        powerUsers: 20
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error seeding authors:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

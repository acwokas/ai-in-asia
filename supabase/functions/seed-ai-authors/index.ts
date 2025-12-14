import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    { name: 'Leonard Pang', handle: 'leo_pang_sg' },
    { name: 'Monica Teo', handle: 'monicateo' },
    { name: 'Nicholas Chong', handle: 'nickchong_dev' },
    { name: 'Patricia Ho', handle: 'pat_ho_ai' },
    { name: 'Quentin Seah', handle: 'qseah_tech' },
    { name: 'Rachel Foo', handle: 'rachelfoo_sg' },
    { name: 'Stanley Yap', handle: 'stanleyY' },
    { name: 'Teresa Kwok', handle: 'teresakwok' },
    { name: 'Victor Chin', handle: 'victorC_ai' },
    { name: 'Wendy Sim', handle: 'wendysim_sg' },
    { name: 'Xavier Toh', handle: 'xaviertoh' },
    { name: 'Yvonne Lau', handle: 'yvonnelau_tech' },
    { name: 'Zachary Chia', handle: 'zachchia' },
    { name: 'Amanda Soh', handle: 'amandasoh_ai' },
    { name: 'Brandon Koh', handle: 'brandonkoh' },
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
    { name: 'Amit Chandra', handle: 'amit_c_tech' },
    { name: 'Bhavana Krishnan', handle: 'bhavana_k' },
    { name: 'Chetan Malhotra', handle: 'chetan_m_dev' },
    { name: 'Deepika Rajan', handle: 'deepika_r_ai' },
    { name: 'Gaurav Bhatia', handle: 'gaurav_b' },
    { name: 'Harini Suresh', handle: 'harini_s_tech' },
    { name: 'Ishaan Kapoor', handle: 'ishaan_k' },
    { name: 'Jyoti Banerjee', handle: 'jyoti_b_dev' },
    { name: 'Kunal Saxena', handle: 'kunal_s_ai' },
    { name: 'Lavanya Murthy', handle: 'lavanya_m' },
    { name: 'Manish Agarwal', handle: 'manish_a_tech' },
    { name: 'Nandini Das', handle: 'nandini_d' },
    { name: 'Om Prakash', handle: 'om_p_dev' },
    { name: 'Pallavi Srinivas', handle: 'pallavi_s_ai' },
    { name: 'Rajesh Venkat', handle: 'rajesh_v' },
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
    { name: 'Antonio Bautista', handle: 'antonio_b_ph' },
    { name: 'Patricia Villanueva', handle: 'pat_v_tech' },
    { name: 'Roberto Aquino', handle: 'roberto_a' },
    { name: 'Kristina Delos Reyes', handle: 'kristina_dr' },
    { name: 'Gabriel Tan', handle: 'gab_tan_ph' },
    { name: 'Elena Navarro', handle: 'elena_n_ai' },
    { name: 'Manuel Gonzales', handle: 'manny_g_dev' },
    { name: 'Rosa Dela Cruz', handle: 'rosa_dc' },
    { name: 'Francisco Lim', handle: 'francis_l_tech' },
    { name: 'Angela Sy', handle: 'angela_sy_ph' },
    { name: 'Ricardo Ocampo', handle: 'ricardo_o' },
    { name: 'Bianca Ong', handle: 'bianca_o_ai' },
    { name: 'Eduardo Chua', handle: 'eduardo_c_dev' },
    { name: 'Theresa Go', handle: 'theresa_g' },
    { name: 'Vincent Yu', handle: 'vince_yu_ph' },
  ],
  china: [
    // Mainland China - varied English proficiency
    { name: 'Li Wei', handle: 'liwei_cn' },
    { name: 'Chen Ming', handle: 'chen_m_ai' },
    { name: 'Zhang Yue', handle: 'zhang_y_dev' },
    { name: 'Wang Lei', handle: 'wanglei_tech' },
    { name: 'Liu Jing', handle: 'liu_j_cn' },
    { name: 'Zhao Hua', handle: 'zhao_h_ai' },
    { name: 'Yang Fei', handle: 'yang_f_dev' },
    { name: 'Wu Ling', handle: 'wu_l_cn' },
    { name: 'Huang Xin', handle: 'huang_x_tech' },
    { name: 'Zhou Mei', handle: 'zhou_m_ai' },
    { name: 'Sun Tao', handle: 'sun_t_cn' },
    { name: 'Ma Xiaoli', handle: 'ma_x_dev' },
    { name: 'Guo Peng', handle: 'guo_p_tech' },
    { name: 'He Yan', handle: 'he_y_ai' },
    { name: 'Xu Ning', handle: 'xu_n_cn' },
    { name: 'Zhu Qing', handle: 'zhu_q_dev' },
    { name: 'Liang Jun', handle: 'liang_j' },
    { name: 'Feng Shan', handle: 'feng_s_tech' },
    { name: 'Dong Mei', handle: 'dong_m_ai' },
    { name: 'Cao Rui', handle: 'cao_r_cn' },
    { name: 'Pan Wei', handle: 'pan_w_dev' },
    { name: 'Xiao Hong', handle: 'xiao_h_cn' },
    { name: 'Qian Yu', handle: 'qian_y_tech' },
    { name: 'Song Lin', handle: 'song_l_ai' },
    { name: 'Tang Jie', handle: 'tang_j_dev' },
    { name: 'Cheng Wei', handle: 'cheng_w_cn' },
    { name: 'Han Fang', handle: 'han_f_tech' },
    { name: 'Jiang Bo', handle: 'jiang_b_ai' },
    { name: 'Lu Ting', handle: 'lu_t_dev' },
    { name: 'Shen Kai', handle: 'shen_k_cn' },
    { name: 'Ye Ming', handle: 'ye_m_tech' },
    { name: 'Zheng Li', handle: 'zheng_l_ai' },
    { name: 'Deng Hao', handle: 'deng_h_dev' },
    { name: 'Ren Xue', handle: 'ren_x_cn' },
    { name: 'Xie Dong', handle: 'xie_d_tech' },
    { name: 'Jin Ping', handle: 'jin_p_ai' },
    { name: 'Bai Yu', handle: 'bai_y_dev' },
    { name: 'Shao Feng', handle: 'shao_f_cn' },
    { name: 'Meng Lei', handle: 'meng_l_tech' },
    { name: 'Fang Qing', handle: 'fang_q_ai' },
  ],
  hong_kong: [
    { name: 'Tony Leung', handle: 'tony_l_hk' },
    { name: 'Maggie Chan', handle: 'maggie_c' },
    { name: 'Raymond Ho', handle: 'raymond_h_tech' },
    { name: 'Elaine Ng', handle: 'elaine_n_ai' },
    { name: 'Derek Wong', handle: 'derek_w_hk' },
    { name: 'Vivian Lau', handle: 'vivian_l' },
    { name: 'Kenneth Chow', handle: 'kenneth_c_dev' },
    { name: 'Joyce Fung', handle: 'joyce_f' },
    { name: 'Peter Yip', handle: 'peter_y_tech' },
    { name: 'Cathy Tam', handle: 'cathy_t_hk' },
    { name: 'Andy Kwok', handle: 'andy_k_dev' },
    { name: 'Winnie Cheung', handle: 'winnie_c_ai' },
    { name: 'Gordon Lee', handle: 'gordon_l_hk' },
    { name: 'Fiona Mak', handle: 'fiona_m_tech' },
    { name: 'Stanley Hui', handle: 'stanley_h_dev' },
  ],
  japan: [
    { name: 'Yuki Tanaka', handle: 'yuki_t_jp' },
    { name: 'Kenji Suzuki', handle: 'kenji_s_tech' },
    { name: 'Haruka Yamamoto', handle: 'haruka_y' },
    { name: 'Takeshi Sato', handle: 'takeshi_s_dev' },
    { name: 'Mika Watanabe', handle: 'mika_w_ai' },
    { name: 'Ryota Ito', handle: 'ryota_i_jp' },
    { name: 'Sakura Nakamura', handle: 'sakura_n' },
    { name: 'Hiroshi Kobayashi', handle: 'hiroshi_k_tech' },
    { name: 'Aoi Kato', handle: 'aoi_k_dev' },
    { name: 'Daiki Yoshida', handle: 'daiki_y_ai' },
    { name: 'Rina Matsuda', handle: 'rina_m_jp' },
    { name: 'Shota Takahashi', handle: 'shota_t' },
    { name: 'Mei Hayashi', handle: 'mei_h_tech' },
    { name: 'Kenta Inoue', handle: 'kenta_i_dev' },
    { name: 'Nanami Shimizu', handle: 'nanami_s_ai' },
  ],
  korea: [
    { name: 'Ji-hoon Kim', handle: 'jihoon_k_kr' },
    { name: 'Soo-yeon Park', handle: 'sooyeon_p_tech' },
    { name: 'Min-jun Lee', handle: 'minjun_l' },
    { name: 'Hye-jin Choi', handle: 'hyejin_c_dev' },
    { name: 'Tae-young Jung', handle: 'taeyoung_j_ai' },
    { name: 'Yoon-ah Han', handle: 'yoonah_h_kr' },
    { name: 'Sung-min Kang', handle: 'sungmin_k' },
    { name: 'Eun-bi Yoon', handle: 'eunbi_y_tech' },
    { name: 'Jun-seo Lim', handle: 'junseo_l_dev' },
    { name: 'So-hee Shin', handle: 'sohee_s_ai' },
    { name: 'Hyun-woo Jang', handle: 'hyunwoo_j_kr' },
    { name: 'Ji-yeon Oh', handle: 'jiyeon_o' },
    { name: 'Dong-hyun Seo', handle: 'donghyun_s_tech' },
    { name: 'Ye-jin Kwon', handle: 'yejin_k_dev' },
    { name: 'Woo-jin Moon', handle: 'woojin_m_ai' },
  ],
  indonesia: [
    { name: 'Rizky Pratama', handle: 'rizky_p_id' },
    { name: 'Dewi Sari', handle: 'dewi_s_tech' },
    { name: 'Budi Santoso', handle: 'budi_s' },
    { name: 'Putri Wulandari', handle: 'putri_w_dev' },
    { name: 'Agus Setiawan', handle: 'agus_s_ai' },
    { name: 'Rina Kusuma', handle: 'rina_k_id' },
    { name: 'Eko Prasetyo', handle: 'eko_p' },
    { name: 'Maya Hartono', handle: 'maya_h_tech' },
    { name: 'Dimas Wijaya', handle: 'dimas_w_dev' },
    { name: 'Siti Rahayu', handle: 'siti_r_ai' },
    { name: 'Andi Nugroho', handle: 'andi_n_id' },
    { name: 'Fitri Handayani', handle: 'fitri_h' },
    { name: 'Hendra Suryadi', handle: 'hendra_s_tech' },
    { name: 'Lestari Putri', handle: 'lestari_p_dev' },
    { name: 'Fajar Hidayat', handle: 'fajar_h_ai' },
  ],
  thailand: [
    { name: 'Somchai Wongsa', handle: 'somchai_w_th' },
    { name: 'Ploy Siriwan', handle: 'ploy_s_tech' },
    { name: 'Krit Tantipong', handle: 'krit_t' },
    { name: 'Nong Chaiyaporn', handle: 'nong_c_dev' },
    { name: 'Pim Supachai', handle: 'pim_s_ai' },
    { name: 'Tong Pattana', handle: 'tong_p_th' },
    { name: 'Fah Methee', handle: 'fah_m' },
    { name: 'Ple Weerachai', handle: 'ple_w_tech' },
    { name: 'Bank Siripong', handle: 'bank_s_dev' },
    { name: 'Mint Narisa', handle: 'mint_n_ai' },
  ],
  vietnam: [
    { name: 'Nguyen Minh', handle: 'nguyen_m_vn' },
    { name: 'Tran Linh', handle: 'tran_l_tech' },
    { name: 'Le Hoang', handle: 'le_h' },
    { name: 'Pham Thao', handle: 'pham_t_dev' },
    { name: 'Vo Duc', handle: 'vo_d_ai' },
    { name: 'Bui Anh', handle: 'bui_a_vn' },
    { name: 'Dang Huy', handle: 'dang_h' },
    { name: 'Do Mai', handle: 'do_m_tech' },
    { name: 'Hoang Nam', handle: 'hoang_n_dev' },
    { name: 'Ngo Trang', handle: 'ngo_t_ai' },
  ],
  malaysia: [
    { name: 'Ahmad Razak', handle: 'ahmad_r_my' },
    { name: 'Siti Aminah', handle: 'siti_a_tech' },
    { name: 'Lee Chong', handle: 'lee_c_my' },
    { name: 'Priya Ramasamy', handle: 'priya_r_dev' },
    { name: 'Mohd Faiz', handle: 'mohd_f_ai' },
    { name: 'Nurul Huda', handle: 'nurul_h' },
    { name: 'Tan Wei', handle: 'tan_w_tech' },
    { name: 'Kavitha Nair', handle: 'kavitha_n_dev' },
    { name: 'Zulkifli Hassan', handle: 'zulkifli_h_ai' },
    { name: 'Michelle Lim', handle: 'michelle_l_my' },
  ],
  usa: [
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
    { name: 'Ashley Walker', handle: 'ashley_w_ai' },
    { name: 'Christopher Hall', handle: 'chris_h_dev' },
    { name: 'Amanda Young', handle: 'amanda_y' },
    { name: 'Andrew King', handle: 'andrew_k_tech' },
    { name: 'Stephanie Wright', handle: 'steph_w_ai' },
    { name: 'Joshua Scott', handle: 'joshua_s_dev' },
    { name: 'Megan Green', handle: 'megan_g' },
    { name: 'Ryan Adams', handle: 'ryan_a_tech' },
    { name: 'Jennifer Baker', handle: 'jen_b_ai' },
    { name: 'Brandon Nelson', handle: 'brandon_n_dev' },
    { name: 'Samantha Carter', handle: 'sam_c' },
    { name: 'Kevin Mitchell', handle: 'kevin_m_tech' },
    { name: 'Rachel Perez', handle: 'rachel_p_ai' },
    { name: 'Tyler Roberts', handle: 'tyler_r_dev' },
    { name: 'Nicole Turner', handle: 'nicole_t' },
    { name: 'Marcus Thompson', handle: 'marcus_t_ai' },
    { name: 'Brittany Collins', handle: 'brittany_c' },
    { name: 'Justin Rivera', handle: 'justin_r_tech' },
    { name: 'Heather Murphy', handle: 'heather_m_dev' },
    { name: 'Derek Rodriguez', handle: 'derek_r_ai' },
    { name: 'Kayla Foster', handle: 'kayla_f' },
    { name: 'Sean Campbell', handle: 'sean_c_tech' },
    { name: 'Christina Morgan', handle: 'christina_m_dev' },
    { name: 'Austin Cooper', handle: 'austin_c_ai' },
    { name: 'Danielle Reed', handle: 'danielle_r' },
  ],
  france: [
    { name: 'Pierre Dubois', handle: 'pierre_d_fr' },
    { name: 'Marie Laurent', handle: 'marie_l_tech' },
    { name: 'Jean Martin', handle: 'jean_m_dev' },
    { name: 'Sophie Bernard', handle: 'sophie_b_ai' },
    { name: 'Nicolas Thomas', handle: 'nicolas_t_fr' },
    { name: 'Camille Petit', handle: 'camille_p' },
    { name: 'Antoine Robert', handle: 'antoine_r_tech' },
    { name: 'Claire Moreau', handle: 'claire_m_dev' },
    { name: 'Julien Simon', handle: 'julien_s_ai' },
    { name: 'Emilie Leroy', handle: 'emilie_l_fr' },
    { name: 'Maxime Girard', handle: 'maxime_g' },
    { name: 'Léa Roux', handle: 'lea_r_tech' },
    { name: 'Alexandre Blanc', handle: 'alex_b_dev' },
    { name: 'Manon Dumont', handle: 'manon_d_ai' },
    { name: 'Hugo Fontaine', handle: 'hugo_f_fr' },
    { name: 'Chloé Vincent', handle: 'chloe_v' },
    { name: 'Lucas Mercier', handle: 'lucas_m_tech' },
    { name: 'Inès Faure', handle: 'ines_f_dev' },
    { name: 'Thomas Chevalier', handle: 'thomas_c_ai' },
    { name: 'Pauline Boyer', handle: 'pauline_b_fr' },
  ],
  uk: [
    { name: 'Oliver Thompson', handle: 'oliver_t_uk' },
    { name: 'Charlotte Davies', handle: 'charlotte_d_tech' },
    { name: 'Harry Wilson', handle: 'harry_w_dev' },
    { name: 'Amelia Taylor', handle: 'amelia_t_ai' },
    { name: 'George Brown', handle: 'george_b_uk' },
    { name: 'Emily Jones', handle: 'emily_j' },
    { name: 'Jack Williams', handle: 'jack_w_tech' },
    { name: 'Sophia Evans', handle: 'sophia_e_dev' },
    { name: 'William Roberts', handle: 'william_r_ai' },
    { name: 'Isabelle Hughes', handle: 'isabelle_h_uk' },
    { name: 'James Clarke', handle: 'james_c' },
    { name: 'Mia Walker', handle: 'mia_w_tech' },
    { name: 'Alexander Green', handle: 'alex_g_dev' },
    { name: 'Poppy Hall', handle: 'poppy_h_ai' },
    { name: 'Henry Lewis', handle: 'henry_l_uk' },
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

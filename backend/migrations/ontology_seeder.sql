-- Update parent_skill_id relations in skill_knowledge_graph

-- 1. Web Development / Frontend Development
WITH parent AS (SELECT id FROM skill_knowledge_graph WHERE normalized_name = 'Frontend Development' OR normalized_name = 'Web Development' LIMIT 1)
UPDATE skill_knowledge_graph
SET parent_skill_id = (SELECT id FROM parent)
WHERE normalized_name IN ('React', 'JavaScript', 'HTML/CSS', 'Tailwind CSS', 'Redux', 'Axios') AND (SELECT id FROM parent) IS NOT NULL;

-- 2. Machine Learning / Data Science
WITH parent AS (SELECT id FROM skill_knowledge_graph WHERE normalized_name = 'Machine Learning' OR normalized_name = 'Data Science' LIMIT 1)
UPDATE skill_knowledge_graph
SET parent_skill_id = (SELECT id FROM parent)
WHERE normalized_name IN ('Pandas', 'NumPy', 'Scikit-Learn', 'SciPy', 'Keras', 'TensorFlow', 'PyTorch') AND (SELECT id FROM parent) IS NOT NULL;

-- 3. Cybersecurity
WITH parent AS (SELECT id FROM skill_knowledge_graph WHERE normalized_name = 'Cybersecurity' OR normalized_name = 'Cybersecurity Fundamentals' LIMIT 1)
UPDATE skill_knowledge_graph
SET parent_skill_id = (SELECT id FROM parent)
WHERE normalized_name IN ('Wireshark', 'Nmap', 'Metasploit', 'Burp Suite', 'Cryptography') AND (SELECT id FROM parent) IS NOT NULL;

-- Seed 25 doctors affiliated with 5 Chennai clinics to production database
-- Run with: psql -h 148.135.136.99 -U postgres -d CLINIK-PROD -f seed-production-doctors.sql

-- Note: clinic_id references match production clinic IDs 16-20

INSERT INTO users (name, username, password, role, specialty, phone, email, clinic_id) VALUES
-- Mother's Speciality Hospital (clinic_id 16)
('Dr. Arun Prasad', 'dr.arun.prasad', '6251edb3f0d662232bb430304afc2e1299c6b82b6865a386df6e5c277bd03d1b789f1d64fc8f407676f4ac33fd3bb9b938f9622c1c330c0da520fedf0d08babe.3bff7bded581922de243105ffa0d5cfd', 'doctor', 'Orthopedic Surgeon', '+91 98765 43212', 'dr.arun.prasad@clinicflow.com', 16),
('Dr. Lakshmi Devi', 'dr.lakshmi.devi', 'a7f7866c6cb1f6b4430266d8f819b96423cc7e4948ca0653bb3a6db9327bbd56c60ee09fd1026dfa6bc981eb9bee332b7f447e1a2e04fb44e589330656815344.b0c2a06349dfb1db47e0decf3a39116e', 'doctor', 'Pediatrician', '+91 98765 43213', 'dr.lakshmi.devi@clinicflow.com', 16),

-- Mahalakshmi Hospital (clinic_id 17)
('Dr. Meena Krishnan', 'dr.meena.krishnan', 'df276303f06c0962fe77c35ab4c892017fb957c27fd105f4898bf4c042075d2b5d81d4de65835d32f38d644bdaf851bffd80ddb25f181e33d6f96f0f95fde25e.c97f0eeeb5411bdd4af08c990fb04704', 'doctor', 'ENT Specialist', '+91 98765 43210', 'dr.meena.krishnan@clinicflow.com', 17),
('Dr. Vijay Shankar', 'dr.vijay.shankar', 'af1a75d64fd050b2bc21163845df28ed9cfbf188f425b241a3083a92ecfe52b0499ffce82f5cf6df2c60ea684d4287f1751f3728701eba175f48fb84ca844135.8efa83aa70babfc71d097234c87c3478', 'doctor', 'Cardiologist', '+91 98765 43211', 'dr.vijay.shankar@clinicflow.com', 17),
('Dr. Anitha Reddy', 'dr.anitha.reddy', '15da2379c5c0256e53e8ab877e307a4bc60c31f3e45fc06161de6b13dc44c69206b48465d4c3a39a8054182317bbcbe2f4bbce71aeb1c1dc5c2709a18b5490f7.90c4674883539d68c6b4bcad2efd25dc', 'doctor', 'Orthopedic Surgeon', '+91 98765 43212', 'dr.anitha.reddy@clinicflow.com', 17),
('Dr. Karthik Raman', 'dr.karthik.raman', 'af202d57ed8a571680b9edcc5d59da64c7701e44467555ed3e3d4674352fed1a7c51664066abf12362f603cba62990d3636ed81b19b57f02c68f7cd7e852dbb8.6435a8977a55698cd05458efac3606a6', 'doctor', 'Pediatrician', '+91 98765 43213', 'dr.karthik.raman@clinicflow.com', 17),
('Dr. Deepa Nair', 'dr.deepa.nair', '9e024afed9d6933b883f87405b3ebbe08d868c1cbf6f628b045714b3201395b1b58d1705af8df20b5993be988ef0da7a3aba49cde34fa7acaf643de427053e73.1b744318a54998110ae97a5142f67a61', 'doctor', 'General Physician', '+91 98765 43214', 'dr.deepa.nair@clinicflow.com', 17),

-- ESSVEE Hospital (clinic_id 18)
('Dr. Sanjay Patel', 'dr.sanjay.patel', 'a4483a3071c4b878cdc056d5b03cff73320e7153a7c61f8aaf2d110a8a7b85125907f09850ddc0545a4acec85801da1fda75a5f7968258d0793e486bbf63a091.314d2c729890d86719cc2cb8de6152e6', 'doctor', 'ENT Specialist', '+91 98765 43210', 'dr.sanjay.patel@clinicflow.com', 18),
('Dr. Revathi Iyer', 'dr.revathi.iyer', '362343c8613016069ced48e3022e7818ae474ba4934d7e6f8a71f70d5188260c3bcb69d531c55d4d6620e3c1e1e51874167828b54e25e159633e4c8d3b36a730.4bd642ddfad33ad4f750df810dc6e669', 'doctor', 'Cardiologist', '+91 98765 43211', 'dr.revathi.iyer@clinicflow.com', 18),
('Dr. Harish Kumar', 'dr.harish.kumar', '9f4bbf4bb7c1d6f5d3486b15b2bb240ce55cefae215685d82b1245e0da569868f9ff52d22fc66efbb1c9aa43cc0e3f86da9e03d380fe1a54442ade5088a76f12.9c0809a2bbd9db711ad075caa0d78684', 'doctor', 'Orthopedic Surgeon', '+91 98765 43212', 'dr.harish.kumar@clinicflow.com', 18),
('Dr. Nithya Menon', 'dr.nithya.menon', '47af4c42b059a538299221dc0aec42b61a3de5fd948374c8b5ed843b96f54af71bdd1b42e36f81e637e49e613453811694cec0c45c853617231e2b76327cec4b.0edd2bbe0c72c39b954e968dceb6833a', 'doctor', 'Pediatrician', '+91 98765 43213', 'dr.nithya.menon@clinicflow.com', 18),
('Dr. Ramesh Babu', 'dr.ramesh.babu', '6bbe75be05f06e63047e63f258fc9ad079b980706d525612deaeb8c0837596435a999a4841cac0816aa22a922acc83789ebd28f065ed73fca9c2e04d1dcd675a.8773f4be24918259a3dac350e0c47465', 'doctor', 'General Physician', '+91 98765 43214', 'dr.ramesh.babu@clinicflow.com', 18),

-- Teja Hospital (clinic_id 19)
('Dr. Kavitha Mohan', 'dr.kavitha.mohan', '87f85daee24eaf05cf693075e3946170eee7ce6c9b9afe2321addf9b1a73b1deb550fb2a624c83eb5e0f49dde43f77cba6e304e4c10765d2bede7789bb0eced6.4ae83d04992e0c53a910278f6017fb3a', 'doctor', 'ENT Specialist', '+91 98765 43210', 'dr.kavitha.mohan@clinicflow.com', 19),
('Dr. Ashok Reddy', 'dr.ashok.reddy', '099bc2e7a86120f8dac806321838bb0bcdc6bc95c14bc325970e68a25870a6ee4aca9975a0ba9042000c8a22001f3b1c5e27011d789858b502efbddd8837d2f6.cfe367e828955caf2f40ad0c1430aa73', 'doctor', 'Cardiologist', '+91 98765 43211', 'dr.ashok.reddy@clinicflow.com', 19),
('Dr. Sangeetha Raj', 'dr.sangeetha.raj', '41c0947ec60044ef76a68132a0e996c8625960eccc5734a62bcf079cd2b8be7f082c7fc892878738e747c677d2b56f8f135313bd02611bd1c7a00a399536463f.98bc251ca08ecb78fac59ca854683323', 'doctor', 'Orthopedic Surgeon', '+91 98765 43212', 'dr.sangeetha.raj@clinicflow.com', 19),
('Dr. Prakash Kumar', 'dr.prakash.kumar', '524b0621681d51f6d2386cbd2afd6482ec8974ad5f06eb267bf027c285b44464b1a8817028846db2f0218e643046c7ec6950ab5c4d3dc7b1af41f8de11f96b6f.14071ec388b4a655146dfa3f62b88cf0', 'doctor', 'Pediatrician', '+91 98765 43213', 'dr.prakash.kumar@clinicflow.com', 19),
('Dr. Divya Lakshmi', 'dr.divya.lakshmi', '6f8b990aff451d256f64d00069c698cc7b704211d0e78148c9eb5205e0692b52ea170541ce150f611afc6db5da67f990b09825b90d80c8aaa331383a6a91567e.859471718c3f528b3d4e8fdd155d8214', 'doctor', 'General Physician', '+91 98765 43214', 'dr.divya.lakshmi@clinicflow.com', 19),

-- Madhavan Eye Care (clinic_id 20)
('Dr. Venkatesh Rao', 'dr.venkatesh.rao', 'e6d0df90fc1f2fa0d0e107b03a435c23e5777119163ee71d2dd39f94403dec8ace5c14c423d85e2a0205d1840ad031fa6b2d312dbe1c68bebb38efc6d957b0f3.1061d6e2f8c486d0f311f2a7e671d2d8', 'doctor', 'ENT Specialist', '+91 98765 43210', 'dr.venkatesh.rao@clinicflow.com', 20),
('Dr. Shalini Devi', 'dr.shalini.devi', 'f263f655cee4ed2e186d881c74a5f0f458683395e3422c818af1753e2e29c7e071cdc31b022ce866ac24fb08f5b8e40ab69bd6482873f123dd46c962a4a25fe8.79ff7f1e8bd3eb4a00c2ca870133692d', 'doctor', 'Cardiologist', '+91 98765 43211', 'dr.shalini.devi@clinicflow.com', 20),
('Dr. Raghavan Kumar', 'dr.raghavan.kumar', '83517f6533565d4885b975266c676b299acfd01d432ec656c909f3653ec6aec7fe7ac171d09f963ca892cff871e69049f161662e597e79f0272badee0ab0f557.25b421a34a0302fbd986bb2a20ec6549', 'doctor', 'Orthopedic Surgeon', '+91 98765 43212', 'dr.raghavan.kumar@clinicflow.com', 20),
('Dr. Preethi Nair', 'dr.preethi.nair', 'e7c869aae0e03a2080dd28e82b3b7cc7bfda41e3a38c884e993a505a778b12e93832e5ae142433185b372041fc9c1a9f686f3f88eea1da68bdaf5066176520f8.80ba07b51c3557f9dfbf519f0955a6b8', 'doctor', 'Pediatrician', '+91 98765 43213', 'dr.preethi.nair@clinicflow.com', 20),
('Dr. Murali Krishna', 'dr.murali.krishna', '77ce1074dbaff0e478928402588d33398dfc2f2ff8c8977e1e906d93334ebf0e1791dc0a0a366dd0a7643942b5d43405b9d30ee0e8b8d5fd032f822ba12bd2bc.82f5bc8728de7bd4c39358c1dcb2e919', 'doctor', 'General Physician', '+91 98765 43214', 'dr.murali.krishna@clinicflow.com', 20)
ON CONFLICT (username) DO NOTHING;

-- Verify insertion
SELECT COUNT(*) as total_doctors FROM users WHERE role='doctor';
SELECT clinic_id, COUNT(*) as doctors_count FROM users WHERE role='doctor' AND clinic_id BETWEEN 16 AND 20 GROUP BY clinic_id ORDER BY clinic_id;

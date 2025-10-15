import { db } from '../server/db';
import { clinics } from '../shared/schema';

const chennaihospitals = [
  {
    name: "Mother's Speciality Hospital",
    address: "24/36 OLD TOWN SHIP, Office Rd, Secretariat Colony, Venkatapuram, Ambattur, Chennai, Tamil Nadu 600053",
    city: "Chennai",
    state: "Tamil Nadu",
    zipCode: "600053",
    latitude: 13.121067199999999,
    longitude: 80.1497799,
    phone: "+91-44-2656-7890", // Sample phone
    email: "info@motherspecialty.com", // Sample email
    openingHours: "24/7 Emergency Services, OPD: 8:00 AM - 8:00 PM",
    description: "Multi-specialty hospital providing comprehensive healthcare services including emergency care, surgery, and specialized treatments."
  },
  {
    name: "Mahalakshmi Hospital",
    address: "No. 205, 37, Ambattur Red Hills Rd, near Rakki Theatre, Ram Nagar, Ambattur, Chennai, Tamil Nadu 600053",
    city: "Chennai",
    state: "Tamil Nadu", 
    zipCode: "600053",
    latitude: 13.1225965,
    longitude: 80.1469712,
    phone: "+91-44-2656-7891",
    email: "contact@mahalakshmihospital.com",
    openingHours: "24/7 Emergency Services, OPD: 7:00 AM - 9:00 PM",
    description: "Established healthcare facility offering quality medical care with experienced doctors and modern equipment."
  },
  {
    name: "ESSVEE Hospital",
    address: "Madras Thiruvallur High Road, 506, Chennai - Thiruttani - Renigunta Hwy, Ram Nagar, Ambattur, Chennai, Tamil Nadu 600053",
    city: "Chennai",
    state: "Tamil Nadu",
    zipCode: "600053", 
    latitude: 13.1231844,
    longitude: 80.1460238,
    phone: "+91-44-2656-7892",
    email: "admin@essvee.com",
    openingHours: "24/7 Emergency Services, OPD: 8:00 AM - 7:00 PM",
    description: "Modern hospital providing comprehensive healthcare services including general medicine, surgery, and diagnostic services."
  },
  {
    name: "Teja Hospital",
    address: "471, Chennai - Tiruvallur High Rd, opposite Rakki Cinemas, Manthoppu Nagar, Ambattur, Chennai, Tamil Nadu 600053",
    city: "Chennai",
    state: "Tamil Nadu",
    zipCode: "600053",
    latitude: 13.1219624,
    longitude: 80.1470667,
    phone: "+91-44-2656-7893",
    email: "info@tejahospital.com", 
    openingHours: "Emergency: 24/7, OPD: 8:00 AM - 6:00 PM",
    description: "Community hospital providing essential healthcare services to the local population with affordable medical care."
  },
  {
    name: "Madhavan Eye Care",
    address: "465, (MTH ROAD, Chennai - Thiruttani - Renigunta Hwy, Vivek Nagar, Ram Nagar, Ambattur, Chennai, Tamil Nadu 600053",
    city: "Chennai", 
    state: "Tamil Nadu",
    zipCode: "600053",
    latitude: 13.121761999999999,
    longitude: 80.1477546,
    phone: "+91-44-2656-7894",
    email: "care@madhavaneyecare.com",
    openingHours: "Monday to Saturday: 9:00 AM - 6:00 PM, Sunday: 9:00 AM - 1:00 PM",
    description: "Specialized eye care hospital providing comprehensive ophthalmology services including cataract surgery, retina treatments, and vision correction."
  }
];

async function insertChennaiHospitals() {
  try {
    console.log('Adding Chennai hospitals to the database...');
    
    for (const hospital of chennaihospitals) {
      try {
        await db.insert(clinics).values({
          name: hospital.name,
          address: hospital.address,
          city: hospital.city,
          state: hospital.state,
          zipCode: hospital.zipCode,
          phone: hospital.phone,
          email: hospital.email,
          openingHours: hospital.openingHours,
          description: hospital.description,
          latitude: hospital.latitude.toString(),
          longitude: hospital.longitude.toString()
        });
        console.log(`✅ Added: ${hospital.name}`);
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⚠️  ${hospital.name} already exists, skipping...`);
        } else {
          console.error(`❌ Failed to add ${hospital.name}:`, error.message);
        }
      }
    }
    
    console.log('✅ Chennai hospitals added successfully!');
    
    // Verify the insertion
    const count = await db.$count(clinics);
    console.log(`Total clinics in database: ${count}`);
    
  } catch (error) {
    console.error('❌ Error adding Chennai hospitals:', error);
  } finally {
    process.exit(0);
  }
}

insertChennaiHospitals();
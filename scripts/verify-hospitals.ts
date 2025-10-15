import { db } from '../server/db';
import { clinics } from '../shared/schema';
import { isNotNull } from 'drizzle-orm';

async function verifyHospitals() {
  try {
    console.log('🏥 Checking hospitals with coordinates...\n');
    
    // Get all clinics with coordinates
    const clinicsWithCoords = await db
      .select()
      .from(clinics)
      .where(isNotNull(clinics.latitude));
    
    console.log(`Found ${clinicsWithCoords.length} clinics with coordinates:\n`);
    
    clinicsWithCoords.forEach((clinic, index) => {
      console.log(`${index + 1}. ${clinic.name}`);
      console.log(`   📍 Location: ${clinic.latitude}, ${clinic.longitude}`);
      console.log(`   📧 Email: ${clinic.email}`);
      console.log(`   📞 Phone: ${clinic.phone}`);
      console.log(`   🏢 Address: ${clinic.address}`);
      console.log(`   🕐 Hours: ${clinic.openingHours}`);
      console.log('');
    });
    
    // Get total count of all clinics
    const totalClinics = await db.$count(clinics);
    console.log(`📊 Total clinics in database: ${totalClinics}`);
    console.log(`📊 Clinics with coordinates: ${clinicsWithCoords.length}`);
    console.log(`📊 Clinics without coordinates: ${totalClinics - clinicsWithCoords.length}`);
    
  } catch (error) {
    console.error('❌ Error verifying hospitals:', error);
  } finally {
    process.exit(0);
  }
}

verifyHospitals();
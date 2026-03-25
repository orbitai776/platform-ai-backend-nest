// firebase.module.ts
import { Module, Global, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';

@Global()
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule implements OnModuleInit {
  onModuleInit() {
    // Khởi tạo Firebase chỉ một lần duy nhất
    if (!admin.apps.length) {
      const firebaseConfig = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      try {
        admin.initializeApp({
          credential: admin.credential.cert(firebaseConfig),
        });
        console.log('✅ Firebase Admin initialized from FirebaseModule');
      } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin:', error);
        // throw error; // Rethrow để NestJS có thể xử lý lỗi khởi tạo module
      }
    }
  }
}
'use client';

import React from 'react';
import { Doctor, PatientMemory, Appointment, Language } from '@/lib/types';
import { DEMO_DOCTORS, INITIAL_MEDICAL_RECORDS, DEMO_HOSPITAL_NAME } from '@/lib/mockData';
import {
  X,
  Calendar,
  Clock,
  FileText,
  Pill,
  Search,
  Bone,
  Upload,
} from 'lucide-react';

/* 1. BOOKING CONFIRMATION MODAL */
export const BookingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor;
  slot: string;
  day: string;
  onConfirm: () => void;
  language: Language;
  patientName?: string;
}> = ({ isOpen, onClose, doctor, slot, day, onConfirm, language, patientName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E4F1EE] shadow-2xl space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-[#E4F1EE] pb-3">
          <h3 className="font-extrabold text-[#163A39] text-base flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#0D7C7B]" />
            <span>{language === 'hi' ? 'अपॉइंटमेंट पुष्टि' : 'Confirm Appointment'}</span>
          </h3>
          <button onClick={onClose} className="text-[#527977] hover:text-[#163A39] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Text-Based Doctor Card (NO Photo) */}
        <div className="bg-[#F7FBFA] p-4 rounded-2xl border border-[#E4F1EE] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0F9F8] text-[#0D7C7B] flex items-center justify-center border border-[#CBE5E1] shrink-0">
              <Bone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#163A39] text-sm">{doctor.name}</h4>
              <p className="text-xs font-bold text-[#0D7C7B]">{doctor.specialty} Specialist</p>
              <p className="text-[11px] text-[#527977] font-medium">{doctor.hospital || DEMO_HOSPITAL_NAME}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E4F1EE] text-xs">
            <div>
              <span className="text-[10px] text-[#527977] uppercase font-bold block">Patient:</span>
              <span className="font-bold text-[#163A39]">{patientName || 'Patient'}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#527977] uppercase font-bold block">Time Slot:</span>
              <span className="font-bold text-[#0D7C7B]">{day} • {slot}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#CBE5E1] text-[#527977] text-xs font-bold hover:bg-[#F0F9F8]"
          >
            {language === 'hi' ? 'रद्द करें' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#0D7C7B] text-white text-xs font-bold hover:bg-[#095A59] shadow-xs"
          >
            {language === 'hi' ? 'बुक करें' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* 2. RESCHEDULE MODAL */
export const RescheduleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  activeAppointment?: Appointment;
  onSelectSlot: (slot: string) => void;
  language: Language;
}> = ({ isOpen, onClose, activeAppointment, onSelectSlot, language }) => {
  if (!isOpen) return null;

  const slots = ['5:00 PM', '6:30 PM'];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E4F1EE] shadow-2xl space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-[#E4F1EE] pb-3">
          <h3 className="font-extrabold text-[#163A39] text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0D7C7B]" />
            <span>{language === 'hi' ? 'समय बदलें' : 'Reschedule Appointment'}</span>
          </h3>
          <button onClick={onClose} className="text-[#527977] hover:text-[#163A39] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#F7FBFA] p-3 rounded-xl border border-[#E4F1EE]">
          <p className="text-xs text-[#527977]">
            Active Doctor: <strong className="text-[#163A39]">{activeAppointment?.doctor_name || 'Dr. Amit Sharma'}</strong>
          </p>
          <p className="text-xs font-bold text-[#0D7C7B] mt-0.5">
            Current: {activeAppointment?.date_text || 'Today'} • {activeAppointment?.time_slot || '3:30 PM'}
          </p>
        </div>

        <div>
          <span className="text-xs font-bold text-[#527977] block mb-2">Available Evening Slots:</span>
          <div className="grid grid-cols-2 gap-2">
            {slots.map((slot) => (
              <button
                key={slot}
                onClick={() => onSelectSlot(slot)}
                className="p-3 bg-[#F0F9F8] hover:bg-[#0D7C7B] hover:text-white border border-[#CBE5E1] text-[#0D7C7B] font-bold text-xs rounded-xl transition-all text-center"
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* 3. MEDICAL RECORDS MODAL */
export const MedicalRecordsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}> = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-[#E4F1EE] shadow-2xl space-y-4 font-sans max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#E4F1EE] pb-3">
          <h3 className="font-extrabold text-[#163A39] text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0D7C7B]" />
            <span>{language === 'hi' ? 'चिकित्सा रिकॉर्ड' : 'Medical Records'}</span>
          </h3>
          <button onClick={onClose} className="text-[#527977] hover:text-[#163A39] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {INITIAL_MEDICAL_RECORDS.map((rec) => (
            <div key={rec.id} className="bg-[#F7FBFA] p-4 rounded-2xl border border-[#E4F1EE] space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-[#163A39] text-xs">
                    {language === 'hi' ? rec.title_hi : rec.title}
                  </h4>
                  <p className="text-[11px] font-semibold text-[#0D7C7B] mt-0.5">
                    {rec.doctor} • {rec.date}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#527977] border border-[#E4F1EE]">
                  {rec.type}
                </span>
              </div>
              <p className="text-xs text-[#527977]">
                {language === 'hi' ? rec.summary_hi : rec.summary}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* 4. MEDICINE MODAL */
export const MedicineModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  patientMemory: PatientMemory;
  language: Language;
}> = ({ isOpen, onClose, patientMemory, language }) => {
  if (!isOpen) return null;

  const rx = patientMemory.recent_prescription;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E4F1EE] shadow-2xl space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-[#E4F1EE] pb-3">
          <h3 className="font-extrabold text-[#163A39] text-base flex items-center gap-2">
            <Pill className="w-5 h-5 text-[#0D7C7B]" />
            <span>{language === 'hi' ? 'दवाई निर्देश' : 'Prescription Details'}</span>
          </h3>
          <button onClick={onClose} className="text-[#527977] hover:text-[#163A39] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {rx ? (
          <div className="bg-[#F7FBFA] p-4 rounded-2xl border border-[#E4F1EE] space-y-2">
            <h4 className="font-extrabold text-[#163A39] text-sm">{rx.medicine}</h4>
            <p className="text-xs font-bold text-[#0D7C7B]">Dosage: {rx.dosage}</p>
            <p className="text-xs text-[#527977]">
              {language === 'hi' ? rx.instructions_hi : rx.instructions}
            </p>
          </div>
        ) : (
          <p className="text-xs text-[#527977]">No active prescriptions found.</p>
        )}
      </div>
    </div>
  );
};

/* 5. DOCTOR BROWSE MODAL */
export const DoctorBrowseModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectDoctor: (doc: Doctor) => void;
  language: Language;
}> = ({ isOpen, onClose, onSelectDoctor, language }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-[#E4F1EE] shadow-2xl space-y-4 font-sans max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#E4F1EE] pb-3">
          <h3 className="font-extrabold text-[#163A39] text-base flex items-center gap-2">
            <Search className="w-5 h-5 text-[#0D7C7B]" />
            <span>{language === 'hi' ? 'अस्पताल के डॉक्टर (10 विशेषज्ञ)' : 'Browse Hospital Doctors (10 Specialists)'}</span>
          </h3>
          <button onClick={onClose} className="text-[#527977] hover:text-[#163A39] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {DEMO_DOCTORS.map((doc) => (
            <div key={doc.id} className="bg-[#F7FBFA] p-4 rounded-2xl border border-[#E4F1EE] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0F9F8] text-[#0D7C7B] flex items-center justify-center border border-[#CBE5E1] shrink-0">
                  <Bone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#163A39] text-sm">{doc.name}</h4>
                  <p className="text-xs font-bold text-[#0D7C7B]">{doc.specialty} Specialist</p>
                  <p className="text-[11px] text-[#527977] font-medium">{doc.experience} experience • Hindi • English</p>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectDoctor(doc);
                  onClose();
                }}
                className="px-4 py-2 bg-[#0D7C7B] hover:bg-[#095A59] text-white text-xs font-bold rounded-xl shadow-2xs shrink-0"
              >
                {language === 'hi' ? 'बुक करें' : 'Book'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* 6. PRESCRIPTION / REPORT UPLOAD MODAL */
export const PrescriptionUploadModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (data: {
    fileName: string;
    doctorName: string;
    specialty: string;
    medicines: string;
    nextAppointmentDate: string;
    diagnosis: string;
  }) => void;
  onBookExtractedAppointment: (specialty: string, doctorName: string, date: string) => void;
  language: Language;
}> = ({ isOpen, onClose, onUploadComplete, onBookExtractedAppointment, language }) => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [extractedData, setExtractedData] = React.useState<{
    fileName: string;
    doctorName: string;
    specialty: string;
    medicines: string;
    nextAppointmentDate: string;
    diagnosis: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
      simulateExtraction(file.name);
    }
  };

  const simulateExtraction = (fileName: string) => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const mockResult = {
        fileName,
        doctorName: 'Dr. Amit Sharma',
        specialty: 'Orthopedic',
        medicines: 'Tab. Paracetamol 650mg (Twice daily), Gel JointFlex (Apply night)',
        nextAppointmentDate: '7 Days Later (20 August 2026)',
        diagnosis: 'Knee Joint Inflammation & Strain',
      };
      setExtractedData(mockResult);
      onUploadComplete(mockResult);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-[#E4F1EE] shadow-2xl space-y-4 font-sans max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#E4F1EE] pb-3">
          <h3 className="font-extrabold text-[#163A39] text-base flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#0D7C7B]" />
            <span>{language === 'hi' ? 'प्रिस्क्रिप्शन व रिपोर्ट अपलोड करें' : 'Upload Prescription / Report'}</span>
          </h3>
          <button onClick={onClose} className="text-[#527977] hover:text-[#163A39] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag & Drop File Upload Area */}
        <div className="border-2 border-dashed border-[#CBE5E1] hover:border-[#0D7C7B] bg-[#F7FBFA] rounded-2xl p-6 text-center space-y-3 transition-colors cursor-pointer relative">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div className="w-12 h-12 rounded-full bg-[#EBF7F5] text-[#0D7C7B] flex items-center justify-center mx-auto border border-[#BFE8E2]">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#163A39]">
              {selectedFile ? selectedFile.name : (language === 'hi' ? 'फ़ाइल चुनने या फ़ोटो लेने के लिए क्लिक करें' : 'Click to Upload Prescription or Lab Report')}
            </p>
            <p className="text-[11px] text-[#527977] mt-0.5">Supports JPG, PNG, WEBP, PDF (Max 10MB)</p>
          </div>
        </div>

        {/* Scanning Indicator */}
        {isScanning && (
          <div className="bg-[#EBF7F5] p-4 rounded-2xl border border-[#BFE8E2] text-center space-y-2 animate-pulse">
            <p className="text-xs font-extrabold text-[#0D7C7B]">
              🔍 {language === 'hi' ? 'प्रिस्क्रिप्शन से दवाइयाँ और अगली अपॉइंटमेंट निकाली जा रही है...' : 'OCR Scanning Prescription & Extracting Reports & Appointments...'}
            </p>
          </div>
        )}

        {/* Extracted Details Result Card */}
        {extractedData && !isScanning && (
          <div className="bg-[#F0F9F8] p-4 rounded-2xl border border-[#CBE5E1] space-y-3">
            <div className="flex items-center justify-between border-b border-[#CBE5E1] pb-2">
              <span className="text-[11px] font-extrabold text-[#0D7C7B] uppercase tracking-wider">
                ✓ Prescription Extracted
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#163A39]">
                OCR Ready
              </span>
            </div>

            {previewUrl && (
              <div className="w-full h-32 rounded-xl overflow-hidden border border-[#CBE5E1] bg-black/5 flex items-center justify-center">
                <img src={previewUrl} alt="Prescription preview" className="object-cover h-full w-full" />
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <div>
                <span className="font-bold text-[#527977]">Doctor & Specialty: </span>
                <span className="font-extrabold text-[#163A39]">{extractedData.doctorName} ({extractedData.specialty})</span>
              </div>
              <div>
                <span className="font-bold text-[#527977]">Diagnosis: </span>
                <span className="font-extrabold text-[#163A39]">{extractedData.diagnosis}</span>
              </div>
              <div>
                <span className="font-bold text-[#527977]">Prescribed Medicines: </span>
                <span className="font-bold text-[#0D7C7B] block mt-0.5">{extractedData.medicines}</span>
              </div>
              <div className="pt-2 border-t border-[#CBE5E1]">
                <span className="font-bold text-[#527977]">Extracted Follow-up Date: </span>
                <span className="font-extrabold text-emerald-700 block mt-0.5">{extractedData.nextAppointmentDate}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  onBookExtractedAppointment(extractedData.specialty, extractedData.doctorName, extractedData.nextAppointmentDate);
                  onClose();
                }}
                className="w-full py-2.5 bg-[#0D7C7B] hover:bg-[#095A59] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Calendar className="w-4 h-4" />
                <span>{language === 'hi' ? 'अगली अपॉइंटमेंट बुक करें' : 'Track & Book Extracted Follow-up'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

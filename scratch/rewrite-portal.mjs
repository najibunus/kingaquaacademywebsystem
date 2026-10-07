import fs from 'fs';

let text = fs.readFileSync('app/parent/portal/ParentPortalClient.tsx', 'utf8');

// Replace imports
if (!text.includes('updateStudentProfile')) {
  text = text.replace(
    /import \{ updateChildDetailsAction \} from @\/lib\/actions\/parentChildren;/,
    import { updateStudentProfile } from \@/lib/actions/students\;\nimport ImageCropperModal from \@/components/ui/ImageCropperModal\;\nimport { createClient } from \@/lib/supabase/client\;
  );
}

// Write it back
fs.writeFileSync('app/parent/portal/ParentPortalClient.tsx', text);

const fs = require('fs');

let text = fs.readFileSync('app/parent/portal/ParentPortalClient.tsx', 'utf8');

// 1. Add imports
text = text.replace(
  /import \{ updateChildDetailsAction \} from "@\/lib\/actions\/parentChildren";/,
  `import { updateStudentProfile } from "@/lib/actions/students";\nimport ImageCropperModal from "@/components/ui/ImageCropperModal";\nimport { createClient } from "@/lib/supabase/client";`
);

// 2. Add cropper states to component
text = text.replace(
  /const \[editSaving, setEditSaving\] = useState\(false\);\n  const \[editError, setEditError\] = useState<string \| null>\(null\);/,
  `const [editSaving, setEditSaving] = useState(false);\n  const [editError, setEditError] = useState<string | null>(null);\n  const [imageToCrop, setImageToCrop] = useState<string | null>(null);\n  const supabase = createClient();`
);

// 3. Add cropper functions
const handleEditSubmitBlock = /async function handleEditSubmit[\s\S]*?window\.location\.reload\(\);\n  \}/;
const newEditFunctions = `
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageToCrop(reader.result?.toString() || null);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setEditSaving(true);
      setImageToCrop(null);
      if (!editingChild) return;

      const fileExt = "jpg";
      const filePath = \`\${editingChild.id}-\${Math.random()}.\${fileExt}\`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setEditingChild({ ...editingChild, avatar_url: data.publicUrl });
    } catch (error) {
      alert("Error uploading image!");
      console.error(error);
    } finally {
      setEditSaving(false);
    }
  };

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingChild) return;
    setEditSaving(true);
    setEditError(null);
    
    const res = await updateStudentProfile(editingChild.id, {
      name: editName,
      date_of_birth: editAge,
      gender: editGender,
      avatar_url: editingChild.avatar_url
    }, ["/parent/portal"]);
    
    setEditSaving(false);
    if (!res.success) {
      setEditError(res.error);
      return;
    }
    setEditingChild(null);
    window.location.reload();
  }
`;
text = text.replace(handleEditSubmitBlock, newEditFunctions);

// 4. Update the modal UI
const modalUIBlock = /<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>\s*<label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var\(--ka-black\)" }}>Profile Picture<\/label>\s*<input\s*type="file" name="profile_picture" accept="image\/\*"\s*style={{ padding: "8px 0", fontSize: "0.875rem", color: "var\(--text-secondary\)" }}\s*\/>\s*<p style={{ margin: 0, fontSize: "0.75rem", color: "var\(--text-secondary\)" }}>Optional. JPG or PNG recommended.<\/p>\s*<\/div>/;

const newModalUI = `
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "var(--bg-light)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {editingChild.avatar_url ? (
                    <img src={editingChild.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  )}
                </div>
                <div>
                  <label style={{ display: "inline-block", padding: "8px 12px", backgroundColor: "var(--bg-light)", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem" }}>
                    {editSaving ? "Uploading..." : "Upload Picture"}
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: "none" }} 
                      onChange={handleFileSelect} 
                      disabled={editSaving} 
                      onClick={(e: any) => e.target.value = ''}
                    />
                  </label>
                </div>
              </div>
`;

text = text.replace(modalUIBlock, newModalUI);

// 5. Append ImageCropperModal before closing div
const finalClosingDiv = /<\/div>\n  \);\n\}\n?$/;
text = text.replace(finalClosingDiv, `
      {imageToCrop && (
        <ImageCropperModal
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => setImageToCrop(null)}
        />
      )}
    </div>
  );
}
`);

fs.writeFileSync('app/parent/portal/ParentPortalClient.tsx', text);

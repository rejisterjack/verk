import { AppearanceSettings } from "@/components/appearance-settings";
import { ViewToolbar } from "@/components/page-header";

export default function AppearanceSettingsPage() {
  return (
    <div className="max-w-2xl px-4 py-3">
      <ViewToolbar
        description="Make Verk look the way you like. These settings are personal and only change how you see the app."
        title="Appearance"
      />
      <AppearanceSettings />
    </div>
  );
}

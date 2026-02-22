import ProfileSettings from './ProfileSettings';
import ProfileNotifications from './ProfileNotifications';
import ProfileAccount from './ProfileAccount';

interface ProfileSettingsPageProps {
  email: string;
  editFirstName: string;
  editLastName: string;
  editUsername: string;
  editCompany: string;
  editJobTitle: string;
  editCountry: string;
  editInterests: string[];
  editNewsletter: boolean;
  saving: boolean;
  onFieldChange: (field: string, value: string | string[] | boolean) => void;
  onToggleInterest: (interest: string) => void;
  onSave: () => void;
}

const ProfileSettingsPage = (props: ProfileSettingsPageProps) => {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-bold mb-4">Profile Information</h2>
        <ProfileSettings {...props} />
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Notifications</h2>
        <ProfileNotifications />
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Security</h2>
        <ProfileAccount />
      </section>
    </div>
  );
};

export default ProfileSettingsPage;

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save } from 'lucide-react';
import { INTEREST_OPTIONS } from '@/constants/interests';

interface ProfileSettingsProps {
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

const ProfileSettings = ({
  email,
  editFirstName,
  editLastName,
  editUsername,
  editCompany,
  editJobTitle,
  editCountry,
  editInterests,
  editNewsletter,
  saving,
  onFieldChange,
  onToggleInterest,
  onSave,
}: ProfileSettingsProps) => {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Personal Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-firstname">First Name</Label>
              <Input id="edit-firstname" value={editFirstName} onChange={(e) => onFieldChange('firstName', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-lastname">Last Name</Label>
              <Input id="edit-lastname" value={editLastName} onChange={(e) => onFieldChange('lastName', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-username">Username</Label>
            <Input id="edit-username" value={editUsername} onChange={(e) => onFieldChange('username', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-email">Email (cannot be changed)</Label>
            <Input id="edit-email" value={email} disabled className="bg-muted" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Professional Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-company">Company</Label>
              <Input id="edit-company" value={editCompany} onChange={(e) => onFieldChange('company', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-jobtitle">Job Title</Label>
              <Input id="edit-jobtitle" value={editJobTitle} onChange={(e) => onFieldChange('jobTitle', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-country">Country</Label>
            <Input id="edit-country" value={editCountry} onChange={(e) => onFieldChange('country', e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Content Preferences</h3>
        <div className="space-y-4">
          <div>
            <Label className="mb-3 block">Interests (Customize your feed)</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-md max-h-64 overflow-y-auto">
              {INTEREST_OPTIONS.map((interest) => (
                <div key={interest} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-${interest}`}
                    checked={editInterests.includes(interest)}
                    onCheckedChange={() => onToggleInterest(interest)}
                  />
                  <label htmlFor={`edit-${interest}`} className="text-sm leading-none cursor-pointer">
                    {interest}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-4 border-t">
            <Checkbox
              id="edit-newsletter"
              checked={editNewsletter}
              onCheckedChange={(checked) => onFieldChange('newsletter', checked as boolean)}
            />
            <label htmlFor="edit-newsletter" className="text-sm cursor-pointer">
              <Link to="/newsletter" className="text-primary hover:underline">Subscribe</Link> to weekly newsletter
            </label>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ProfileSettings;

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { type EnrichmentDetails, type Incident } from '../data/staticData';
import { submitReportEnrichment } from '../lib/reportDatabase';
import { upsertCommandCenterIncident } from '../lib/commandCenterIncidentStore';

interface Props {
  selectedId: string;
  selectedIncident?: Incident;
  onSubmitted?: (
    incidentId: string,
    submittedData?: {
      confirmedSeverity: 'Mild' | 'Moderate' | 'Extreme';
      confirmedAccidentType: string;
      enrichmentDetails: EnrichmentDetails;
    }
  ) => void;
  formId?: string;
  hideSubmitButton?: boolean;
}

const accidentTypes = [
  'Rear-end collision',
  'Side-swipe',
  'Head-on',
  'Vehicle rollover',
  'Pedestrian involved',
  'Animal on road',
  'Vehicle breakdown',
  'Road debris',
  'Multi-vehicle pile-up',
];

const mapSeverityToConfirmed = (severity?: Incident['severity']) => {
  if (severity === 'MINOR') return 'Mild';
  if (severity === 'MODERATE' || severity === 'MAJOR') return 'Moderate';
  if (severity === 'CRITICAL') return 'Extreme';
  return '';
};

const createInitialFormData = (selectedIncident?: Incident) => {
  return {
    confirmedSeverity: mapSeverityToConfirmed(selectedIncident?.severity),
    accidentType: [],
    vehiclesInvolved: '',
    casualties: 'None',
    ambulanceRequired: 'No',
    trafficFlow: 'Slow',
    laneBlockage: 'No lanes blocked',
    roadType: 'Arterial',
    hazardousMaterial: 'No',
    gpsCoordinates: selectedIncident ? `${selectedIncident.lat.toFixed(6)}, ${selectedIncident.lng.toFixed(6)}` : '',
    photos: [] as File[],
    officerNotes: '',
  };
};

export default function IncidentEnrichmentForm({ selectedId, selectedIncident, onSubmitted, formId, hideSubmitButton = false }: Props) {
  const [formData, setFormData] = useState(() => createInitialFormData(selectedIncident));

  useEffect(() => {
    setFormData(createInitialFormData(selectedIncident));
  }, [selectedId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiSelect = (type: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      accidentType: checked
        ? [...prev.accidentType, type]
        : prev.accidentType.filter(item => item !== type),
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({ ...prev, photos: Array.from(e.target.files).slice(0, 5) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedIncident) {
      alert('Please select a reported incident first.');
      return;
    }

    if (!formData.confirmedSeverity || !formData.vehiclesInvolved || !formData.casualties || !formData.trafficFlow || !formData.laneBlockage || !formData.roadType) {
      alert('Please fill all required enrichment fields before verification.');
      return;
    }

    const enrichedType = formData.accidentType[0] || selectedIncident.type;
    const enrichmentDetails: EnrichmentDetails = {
      confirmedSeverity: formData.confirmedSeverity,
      accidentType: [...formData.accidentType],
      vehiclesInvolved: formData.vehiclesInvolved,
      casualties: formData.casualties,
      ambulanceRequired: formData.ambulanceRequired,
      trafficFlow: formData.trafficFlow,
      laneBlockage: formData.laneBlockage,
      roadType: formData.roadType,
      hazardousMaterial: formData.hazardousMaterial,
      gpsCoordinates: formData.gpsCoordinates,
      photoNames: formData.photos.map(photo => photo.name),
      officerNotes: formData.officerNotes,
    };

    try {
      await submitReportEnrichment({
        reportId: selectedIncident.id,
        confirmedSeverity: formData.confirmedSeverity as 'Mild' | 'Moderate' | 'Extreme',
        confirmedAccidentType: enrichedType,
        enrichmentDetails,
      });
    } catch {
      alert('Unable to store enrichment details in backend. Please try again.');
      return;
    }

    upsertCommandCenterIncident({
      ...selectedIncident,
      status: 'ACTIVE',
      type: enrichedType,
      confirmedSeverity: formData.confirmedSeverity,
      confirmedAccidentType: enrichedType,
      description: enrichmentDetails.officerNotes || selectedIncident.description,
      enrichmentDetails,
    });

    onSubmitted?.(selectedIncident.id, {
      confirmedSeverity: formData.confirmedSeverity as 'Mild' | 'Moderate' | 'Extreme',
      confirmedAccidentType: enrichedType,
      enrichmentDetails,
    });

    setFormData(createInitialFormData(selectedIncident));
  };

  return (
    <div className="p-4 rounded-xl border border-[#dbeafe] bg-white">
      <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Incident Enrichment Form</h2>
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2 rounded-lg border border-[#e5e7eb] bg-[#f8fbff] p-3">
          <Label htmlFor="confirmedSeverity">Confirmed Severity *</Label>
          <Select value={formData.confirmedSeverity} onValueChange={value => handleSelectChange('confirmedSeverity', value)}>
            <SelectTrigger id="confirmedSeverity">
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Mild">Mild</SelectItem>
              <SelectItem value="Moderate">Moderate</SelectItem>
              <SelectItem value="Extreme">Extreme</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 rounded-lg border border-[#e5e7eb] bg-[#f8fbff] p-3">
          <Label>Accident Type *</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {accidentTypes.map(type => (
              <label key={type} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.accidentType.includes(type)}
                  onChange={e => handleMultiSelect(type, e.target.checked)}
                  className="h-4 w-4"
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-[#e5e7eb] bg-[#f8fbff] p-3">
          <div className="space-y-2">
            <Label htmlFor="vehiclesInvolved">Vehicles Involved *</Label>
            <Input
              id="vehiclesInvolved"
              name="vehiclesInvolved"
              type="number"
              min={1}
              max={50}
              value={formData.vehiclesInvolved}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="casualties">Casualties Observed *</Label>
            <Select value={formData.casualties} onValueChange={value => handleSelectChange('casualties', value)}>
              <SelectTrigger id="casualties">
                <SelectValue placeholder="Select casualties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Injured persons present">Injured persons present</SelectItem>
                <SelectItem value="Fatality suspected">Fatality suspected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ambulanceRequired">Ambulance Required</Label>
            <Select value={formData.ambulanceRequired} onValueChange={value => handleSelectChange('ambulanceRequired', value)}>
              <SelectTrigger id="ambulanceRequired">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
                <SelectItem value="Already on scene">Already on scene</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trafficFlow">Current Traffic Flow *</Label>
            <Select value={formData.trafficFlow} onValueChange={value => handleSelectChange('trafficFlow', value)}>
              <SelectTrigger id="trafficFlow">
                <SelectValue placeholder="Select traffic flow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Free-flowing">Free-flowing</SelectItem>
                <SelectItem value="Slow">Slow</SelectItem>
                <SelectItem value="Heavily congested">Heavily congested</SelectItem>
                <SelectItem value="Completely blocked">Completely blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-[#e5e7eb] bg-[#f8fbff] p-3">
          <div className="space-y-2">
            <Label htmlFor="laneBlockage">Lane Blockage *</Label>
            <Select value={formData.laneBlockage} onValueChange={value => handleSelectChange('laneBlockage', value)}>
              <SelectTrigger id="laneBlockage">
                <SelectValue placeholder="Select lane status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="No lanes blocked">No lanes blocked</SelectItem>
                <SelectItem value="1 lane blocked">1 lane blocked</SelectItem>
                <SelectItem value="Multiple lanes blocked">Multiple lanes blocked</SelectItem>
                <SelectItem value="Full road blocked">Full road blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="roadType">Road Type *</Label>
            <Select value={formData.roadType} onValueChange={value => handleSelectChange('roadType', value)}>
              <SelectTrigger id="roadType">
                <SelectValue placeholder="Select road type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Highway">Highway</SelectItem>
                <SelectItem value="Arterial">Arterial</SelectItem>
                <SelectItem value="Collector road">Collector road</SelectItem>
                <SelectItem value="Residential lane">Residential lane</SelectItem>
                <SelectItem value="Bridge">Bridge</SelectItem>
                <SelectItem value="Underpass">Underpass</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-[#e5e7eb] bg-[#f8fbff] p-3">
          <div className="space-y-2">
            <Label htmlFor="hazardousMaterial">Hazardous Material Present</Label>
            <Select value={formData.hazardousMaterial} onValueChange={value => handleSelectChange('hazardousMaterial', value)}>
              <SelectTrigger id="hazardousMaterial">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gpsCoordinates">Exact GPS Coordinates</Label>
            <Input
              id="gpsCoordinates"
              name="gpsCoordinates"
              value={formData.gpsCoordinates}
              onChange={handleChange}
              placeholder="23.215, 72.637"
            />
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-[#e5e7eb] bg-[#f8fbff] p-3">
          <Label>Photo Update (up to 5)</Label>
          <Input type="file" multiple accept="image/*" onChange={handleFileChange} />
        </div>

        <div className="space-y-2 rounded-lg border border-[#e5e7eb] bg-[#f8fbff] p-3">
          <Label>Officer Field Notes</Label>
          <Textarea
            name="officerNotes"
            value={formData.officerNotes}
            onChange={handleChange}
            maxLength={500}
            rows={5}
            placeholder="Enter officer notes (up to 500 chars)"
          />
        </div>

        {!hideSubmitButton && (
          <Button type="submit" className="w-full" variant="default">
            Submit to Command Center
          </Button>
        )}
      </form>
    </div>
  );
}
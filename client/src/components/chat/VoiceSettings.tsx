import React, { useEffect, useState } from 'react';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

// Premium voice names that typically sound better
const PREMIUM_VOICES = [
  'Samantha', 'Daniel', 'Karen', 'Thomas', 'Catherine', 'Alex',
  'Moira', 'Tessa', 'Allison', 'Google UK English Female',
  'Microsoft Zira', 'Microsoft David', 'Microsoft Mark'
];

// Helper function to classify voice quality
const getVoiceQuality = (voice: SpeechSynthesisVoice) => {
  if (PREMIUM_VOICES.some(name => voice.name.includes(name))) {
    return 3; // Premium quality
  }
  if (voice.localService === false) {
    return 2; // Cloud voices are usually better
  }
  return 1; // Basic local voice
};

// Helper to create a short demo text
const getVoiceDemoText = (voice: SpeechSynthesisVoice) => {
  if (voice.lang.includes('en')) {
    return "Hello, I'm your digital marketing professor. How can I help you today?";
  }
  return "I'm your AI assistant.";
};

export default function VoiceSettings() {
  const { voices, setOptions, speak, cancel, browserSupportsSpeechSynthesis } = useSpeechSynthesis();
  const [isVoiceSet, setIsVoiceSet] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(0.9); // Slightly slower than default for more natural pacing
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const { toast } = useToast();

  // Set up a good default voice when voices are loaded
  useEffect(() => {
    if (!browserSupportsSpeechSynthesis || voices.length === 0 || isVoiceSet) return;

    // Get all English voices
    const englishVoices = voices.filter(voice => voice.lang.includes('en'));
    
    // Sort by quality
    const sortedVoices = [...englishVoices].sort((a, b) => {
      return getVoiceQuality(b) - getVoiceQuality(a);
    });

    // Apply the best match
    const bestVoice = sortedVoices[0] || voices[0];
    
    if (bestVoice) {
      console.log('Setting voice to:', bestVoice.name, bestVoice.lang);
      setSelectedVoice(bestVoice);
      setOptions({
        voice: bestVoice,
        rate: rate,
        pitch: pitch,
        volume: volume
      });
      setIsVoiceSet(true);
    }
  }, [voices, browserSupportsSpeechSynthesis, isVoiceSet, setOptions, rate, pitch, volume]);

  // Apply voice changes
  useEffect(() => {
    if (selectedVoice && isVoiceSet) {
      setOptions({
        voice: selectedVoice,
        rate: rate,
        pitch: pitch, 
        volume: volume
      });
    }
  }, [selectedVoice, rate, pitch, volume, setOptions, isVoiceSet]);

  // Test the selected voice
  const handleTestVoice = () => {
    if (!selectedVoice) return;
    
    cancel();
    
    // Create a demo with natural pauses and breathing
    const demoText = getVoiceDemoText(selectedVoice)
      .replace('.', '... ') // Add natural pauses at periods
      .replace('?', '? '); // Add pauses at questions
    
    speak(demoText);
    
    toast({
      title: "Testing voice",
      description: `Playing sample with ${selectedVoice.name}`,
    });
  };

  // Toggle the dialog
  const toggleDialog = () => {
    setIsDialogOpen(!isDialogOpen);
  };

  return (
    <>
      {/* Button to open voice settings (to be used in appropriate UI locations) */}
      <Button 
        onClick={toggleDialog}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <span className="material-icons text-sm">settings_voice</span>
        <span>Voice Settings</span>
      </Button>
      
      {/* Voice Settings Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Voice Settings</DialogTitle>
            <DialogDescription>
              Customize the AI professor's voice to your preference
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Voice Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="voice" className="text-right">
                Voice
              </Label>
              <Select 
                onValueChange={(value) => {
                  const voice = voices.find(v => v.name === value);
                  if (voice) setSelectedVoice(voice);
                }}
                value={selectedVoice?.name}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Premium Voices</SelectLabel>
                    {voices
                      .filter(voice => 
                        voice.lang.includes('en') && 
                        PREMIUM_VOICES.some(name => voice.name.includes(name))
                      )
                      .map(voice => (
                        <SelectItem key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </SelectItem>
                      ))
                    }
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Standard Voices</SelectLabel>
                    {voices
                      .filter(voice => 
                        voice.lang.includes('en') && 
                        !PREMIUM_VOICES.some(name => voice.name.includes(name))
                      )
                      .map(voice => (
                        <SelectItem key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </SelectItem>
                      ))
                    }
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            {/* Speech Rate */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rate" className="text-right">
                Speed
              </Label>
              <div className="col-span-3 flex flex-col gap-2">
                <Slider
                  id="rate"
                  min={0.5}
                  max={1.5}
                  step={0.1}
                  value={[rate]}
                  onValueChange={([value]) => setRate(value)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Slower</span>
                  <span>Normal</span>
                  <span>Faster</span>
                </div>
              </div>
            </div>
            
            {/* Pitch */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pitch" className="text-right">
                Pitch
              </Label>
              <div className="col-span-3 flex flex-col gap-2">
                <Slider
                  id="pitch"
                  min={0.7}
                  max={1.3}
                  step={0.1}
                  value={[pitch]}
                  onValueChange={([value]) => setPitch(value)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Lower</span>
                  <span>Normal</span>
                  <span>Higher</span>
                </div>
              </div>
            </div>
            
            {/* Volume */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="volume" className="text-right">
                Volume
              </Label>
              <div className="col-span-3 flex flex-col gap-2">
                <Slider
                  id="volume"
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  value={[volume]}
                  onValueChange={([value]) => setVolume(value)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Quiet</span>
                  <span>Medium</span>
                  <span>Loud</span>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleTestVoice}>
              Test Voice
            </Button>
            <Button onClick={() => setIsDialogOpen(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
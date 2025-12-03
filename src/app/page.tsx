"use client";
import React, { useState, useEffect } from 'react';
import { Scale, Sparkles, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, LabelList } from 'recharts';

const SZNDailyPlanner = () => {
  const [dailyCalories, setDailyCalories] = useState('');
  const [proteinGoal, setProteinGoal] = useState('100');
  const [breakfast, setBreakfast] = useState('');
  const [lunch, setLunch] = useState('');
  const [dinner, setDinner] = useState('');
  const [snacks, setSnacks] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const targetsResult = await window.storage.get('user-targets');
        if (targetsResult) {
          const targets = JSON.parse(targetsResult.value);
          if (targets.dailyCalories) setDailyCalories(targets.dailyCalories);
          if (targets.proteinGoal) setProteinGoal(targets.proteinGoal);
        }

        const templatesResult = await window.storage.list('template:');
        if (templatesResult && templatesResult.keys) {
          const templates = [];
          for (const key of templatesResult.keys) {
            try {
              const templateResult = await window.storage.get(key);
              if (templateResult) {
                templates.push(JSON.parse(templateResult.value));
              }
            } catch (err) {
              console.log('Template not found:', key);
            }
          }
          setSavedTemplates(templates);
        }
      } catch (error) {
        console.log('No saved data found');
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const saveTargets = async () => {
      try {
        await window.storage.set('user-targets', JSON.stringify({
          dailyCalories,
          proteinGoal
        }));
      } catch (error) {
        console.error('Error saving targets:', error);
      }
    };
    if (dailyCalories || proteinGoal) {
      saveTargets();
    }
  }, [dailyCalories, proteinGoal]);

  const calculateMacroTargets = () => {
    if (!dailyCalories) return null;
    const cals = parseInt(dailyCalories);
    return {
      protein: parseInt(proteinGoal),
      carbs: Math.round((cals * 0.40) / 4),
      fats: Math.round((cals * 0.30) / 9)
    };
  };

  const macroTargets = calculateMacroTargets();

  const getStatusColor = (status) => {
    if (status === 'on track') return '#6b7b5e';
    if (status === 'low') return '#c9a96e';
    if (status === 'high') return '#8a7968';
    return '#9ca3af';
  };

  const getStatusIcon = (status) => {
    if (status === 'on track') return '✅';
    if (status === 'low') return '💡';
    if (status === 'high') return '⚖️';
    return '•';
  };

  const getRatingColor = (rating) => {
    if (rating === 'excellent') return '#6b7b5e';
    if (rating === 'good') return '#c9a96e';
    if (rating === 'needs work') return '#d97706';
    return '#9ca3af';
  };

  const getRatingEmoji = (rating) => {
    if (rating === 'excellent') return '🌟';
    if (rating === 'good') return '👍';
    if (rating === 'needs work') return '💡';
    return '';
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a name for this meal template');
      return;
    }

    const template = {
      id: `template:${Date.now()}`,
      name: templateName,
      breakfast,
      lunch,
      dinner,
      snacks,
      createdAt: new Date().toISOString()
    };

    try {
      await window.storage.set(template.id, JSON.stringify(template));
      setSavedTemplates([...savedTemplates, template]);
      setTemplateName('');
      alert('Template saved!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template. Please try again.');
    }
  };

  const loadTemplate = (template) => {
    setBreakfast(template.breakfast || '');
    setLunch(template.lunch || '');
    setDinner(template.dinner || '');
    setSnacks(template.snacks || '');
    setShowTemplates(false);
    setAnalysis(null);
  };

  const deleteTemplate = async (templateId) => {
    if (!confirm('Delete this template?')) return;

    try {
      await window.storage.delete(templateId);
      setSavedTemplates(savedTemplates.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const analyzeDailyMeals = async () => {
    if (!breakfast && !lunch && !dinner && !snacks) return;
    
    setLoading(true);
    
    const systemPrompt = `You are a nutrition-aware meal planner that helps users balance their entire day.

Daily calorie target: ${dailyCalories || 'not provided'}
Protein goal: ${proteinGoal}g
Veggie goal: 300g total per day
Fruit goal: 100-200g per day

CRITICAL - PROTEIN CALCULATIONS:
- 1 large egg = 6g protein
- 100g cooked chicken breast = 31g protein
- 150g cooked chicken breast = 47g protein
- Greek yogurt = 10g per 100g
- Paneer = 18g per 100g

CRITICAL - VEGETABLE MEASUREMENTS:
- Vegetables are measured by WEIGHT, not volume
- 100g mixed vegetables = 100g vegetables (not 50g!)
- 150g broccoli = 150g vegetables
- 1 cup raw vegetables ≈ 100g
- 1 cup cooked vegetables ≈ 150g
- Always report the ACTUAL WEIGHT the user mentioned or estimated
- If someone says "100g mixed veg", that counts as 100g toward their 300g veggie goal

CRITICAL - IDENTIFY MISSING MACROS:
If a meal is missing carbs, protein, or veggies, flag it and suggest additions.
Example: Salmon + broccoli = missing CARBS → suggest rice or sweet potato

TREATS & DESSERTS:
- Small desserts/treats are totally fine and normal (1-2 Ferrero Rocher, small cookie, piece of chocolate)
- Only flag as excessive if it's a LOT of dessert (entire cake slice, multiple servings, etc.)
- Don't shame or make people feel bad about reasonable treats
- Focus on overall balance, not perfection

VEGETARIAN PROTEIN BOOSTERS:
Banza pasta (25g per 100g), hemp seeds (10g per 3 tbsp), nutritional yeast (8g per 2 tbsp), tempeh (19g per 100g)

Give SPECIFIC portions to weigh out with both grams AND hand portions.

CRITICAL - ALWAYS INCLUDE EYEBALL PORTIONS:
For every food item, provide BOTH the weight AND an eyeball/hand portion so people can estimate when eating out:
- Protein: "150g chicken breast (1 palm)" or "110g salmon (1 palm)"
- Carbs: "200g rice (1 cupped handful)" or "150g sweet potato (1 fist)"
- Veggies: "100g broccoli (1 fist)" or "150g salad (2 big handfuls)"
- Fats: "15g olive oil (1 thumb)" or "30g nuts (small handful)"

Common eyeball portions:
- 1 palm (thickness + size of palm) = 100-120g cooked meat/fish
- 1 fist = 100-150g veggies or 1 medium fruit
- 1 cupped handful = 150-200g cooked grains/pasta
- 1 thumb = 15g fats (oils, butter, nut butter)
- Small handful = 30g nuts/seeds

ALWAYS format as: "Weight (eyeball portion)" - e.g., "150g chicken (1 palm), 200g rice (1 cupped handful), 100g broccoli (1 fist)"

Respond ONLY with valid JSON (no markdown):
{
  "dailySummary": {
    "calories": "number",
    "protein": "number",
    "carbs": "number",
    "fats": "number",
    "veggies": "number",
    "fruit": "number",
    "status": {
      "overall": "on track / needs adjustment",
      "protein": "on track / low / high",
      "veggies": "on track / low / high",
      "fruit": "on track / low / high",
      "carbs": "on track / low / high",
      "fats": "on track / low / high"
    }
  },
  "mealBreakdown": {
    "breakfast": {
      "description": "what they said",
      "rating": "excellent / good / needs work",
      "calories": "estimated calories for this meal",
      "estimated": {"protein": "Xg", "carbs": "Xg", "fats": "Xg", "veggies": "Xg", "fruit": "Xg"},
      "portions": "SPECIFIC weights - e.g. Weigh out: 150g chicken, 200g rice",
      "missing": "what's missing - ONLY if significant",
      "quickFix": "suggestions with weights - ONLY if needed"
    },
    "lunch": {"description": "", "rating": "", "calories": "", "estimated": {}, "portions": "", "missing": "", "quickFix": ""},
    "dinner": {"description": "", "rating": "", "calories": "", "estimated": {}, "portions": "", "missing": "", "quickFix": ""},
    "snacks": {"description": "", "rating": "", "calories": "", "estimated": {}, "portions": "", "missing": "", "quickFix": ""}
  },
  "actionableTakeaways": ["3-5 simple bullets"]
}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [{
            role: 'user',
            content: `Breakfast: ${breakfast || 'Not provided'}
Lunch: ${lunch || 'Not provided'}
Dinner: ${dinner || 'Not provided'}
Snacks: ${snacks || 'Not provided'}`
          }],
          system: systemPrompt
        })
      });

      const data = await response.json();
      const textContent = data.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('');
      
      const cleanedText = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsedAnalysis = JSON.parse(cleanedText);
      setAnalysis(parsedAnalysis);
    } catch (error) {
      console.error('Error:', error);
      alert('Had trouble analyzing. Try being more specific like "2 eggs with toast"');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{background: 'linear-gradient(to bottom right, #f5f5f4, #e8ebe7, #d4d9d0)'}}>
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Calendar className="w-8 h-8" style={{color: '#6b7b5e'}} />
              <h1 className="text-4xl font-bold" style={{background: 'linear-gradient(to right, #6b7b5e, #8a9478)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                SZN Daily Meal Planner
              </h1>
            </div>
            <p className="text-gray-600">Plan your entire day and see where you need to adjust</p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Daily Targets (Auto-saved)</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Daily calorie target</label>
                <input
                  type="number"
                  value={dailyCalories}
                  onChange={(e) => setDailyCalories(e.target.value)}
                  placeholder="e.g., 2000"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Protein goal (g)</label>
                <input
                  type="number"
                  value={proteinGoal}
                  onChange={(e) => setProteinGoal(e.target.value)}
                  placeholder="e.g., 100"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">Meal Templates</h3>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="px-4 py-2 rounded-lg font-medium text-sm"
                style={{backgroundColor: '#e8ebe7', color: '#6b7b5e'}}
              >
                {showTemplates ? 'Hide' : `View (${savedTemplates.length})`}
              </button>
            </div>

            {showTemplates && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                {savedTemplates.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-4">No templates yet</p>
                ) : (
                  <div className="space-y-2">
                    {savedTemplates.map(template => (
                      <div key={template.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                        <div>
                          <p className="font-semibold">{template.name}</p>
                          <p className="text-xs text-gray-500">{new Date(template.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => loadTemplate(template)} className="px-3 py-1 rounded text-sm" style={{backgroundColor: '#6b7b5e', color: 'white'}}>Load</button>
                          <button onClick={() => deleteTemplate(template.id)} className="px-3 py-1 rounded text-sm bg-red-100 text-red-700">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(breakfast || lunch || dinner || snacks) && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="flex-1 p-2 border-2 border-gray-300 rounded-lg"
                />
                <button onClick={saveTemplate} className="px-4 py-2 rounded-lg text-sm" style={{backgroundColor: '#6b7b5e', color: 'white'}}>Save</button>
              </div>
            )}
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">🍳 Breakfast</label>
              <textarea value={breakfast} onChange={(e) => setBreakfast(e.target.value)} placeholder="e.g., 2 eggs, toast" className="w-full p-3 border-2 rounded-lg" rows="2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">🥗 Lunch</label>
              <textarea value={lunch} onChange={(e) => setLunch(e.target.value)} placeholder="e.g., chicken salad" className="w-full p-3 border-2 rounded-lg" rows="2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">🍽️ Dinner</label>
              <textarea value={dinner} onChange={(e) => setDinner(e.target.value)} placeholder="e.g., salmon with rice" className="w-full p-3 border-2 rounded-lg" rows="2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">🍎 Snacks</label>
              <textarea value={snacks} onChange={(e) => setSnacks(e.target.value)} placeholder="e.g., Greek yogurt" className="w-full p-3 border-2 rounded-lg" rows="2" />
            </div>
          </div>

          <button
            onClick={analyzeDailyMeals}
            disabled={loading || (!breakfast && !lunch && !dinner && !snacks)}
            className="w-full text-white py-4 rounded-lg font-semibold mb-8 flex items-center justify-center gap-2"
            style={{background: loading ? '#9ca89080' : 'linear-gradient(to right, #6b7b5e, #8a9478)'}}
          >
            {loading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing...</> : <><Sparkles className="w-5 h-5" />Analyze My Day</>}
          </button>

          {analysis && (
            <div className="space-y-6">
              <div className="border-l-4 p-6 rounded-lg" style={{backgroundColor: '#e8ebe7', borderColor: '#6b7b5e'}}>
                <h2 className="text-2xl font-bold mb-4" style={{color: '#6b7b5e'}}>📊 Daily Summary</h2>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Calories</span>
                    <div className="flex gap-2">
                      <span className="text-2xl font-bold">{analysis.dailySummary.calories}</span>
                      {dailyCalories && <span className="text-gray-500">/ {dailyCalories}</span>}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Protein</span>
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-2xl font-bold" style={{color: getStatusColor(analysis.dailySummary.status.protein)}}>{analysis.dailySummary.protein}g</span>
                        <span className="text-gray-500 ml-1">/ {proteinGoal}g</span>
                      </div>
                      {analysis.dailySummary.status.protein === 'low' && (
                        <div className="relative group">
                          <span className="text-xl cursor-help">💡</span>
                          <div className="absolute right-0 top-8 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <p className="font-semibold mb-1">Need {parseInt(proteinGoal) - parseInt(analysis.dailySummary.protein)}g more</p>
                            <p>Try: Greek yogurt (250g = 25g), chicken (110g = 34g), or protein shake</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Carbs</span>
                    <div>
                      <span className="text-2xl font-bold">{analysis.dailySummary.carbs}</span>
                      {macroTargets && <span className="text-gray-500 ml-1">/ ~{macroTargets.carbs}g</span>}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Fats</span>
                    <div>
                      <span className="text-2xl font-bold">{analysis.dailySummary.fats}</span>
                      {macroTargets && <span className="text-gray-500 ml-1">/ ~{macroTargets.fats}g</span>}
                    </div>
                  </div>
                  <div className="border-t-2 border-gray-300 my-3"></div>
                  <div className="flex justify-between">
                    <span className="font-medium">Veggies</span>
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-2xl font-bold" style={{color: getStatusColor(analysis.dailySummary.status.veggies)}}>{analysis.dailySummary.veggies}</span>
                        <span className="text-gray-500 ml-1">/ 300g</span>
                      </div>
                      {analysis.dailySummary.status.veggies === 'low' && (
                        <div className="relative group">
                          <span className="text-xl cursor-help">💡</span>
                          <div className="absolute right-0 top-8 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <p className="font-semibold mb-1">Need {300 - parseInt(analysis.dailySummary.veggies)}g more</p>
                            <p>Try: Salad (100g), broccoli (100g), or mixed veggies (150g)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Fruit</span>
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-2xl font-bold" style={{color: getStatusColor(analysis.dailySummary.status.fruit || 'on track')}}>{analysis.dailySummary.fruit}</span>
                        <span className="text-gray-500 ml-1">/ 100-200g</span>
                      </div>
                      {analysis.dailySummary.status.fruit === 'low' && (
                        <div className="relative group">
                          <span className="text-xl cursor-help">💡</span>
                          <div className="absolute right-0 top-8 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <p className="font-semibold mb-1">Add fruit!</p>
                            <p>Try: Apple (150g), banana (120g), or berries (150g)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border-t-2 pt-4 flex justify-between">
                    <span className="font-semibold">Overall</span>
                    <span className="font-bold px-4 py-1 rounded-full" style={{backgroundColor: `${getStatusColor(analysis.dailySummary.status.overall)}20`, color: getStatusColor(analysis.dailySummary.status.overall)}}>
                      {analysis.dailySummary.status.overall}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-4">🍽️ Meal Breakdown</h2>
                
                {/* Calorie Distribution Chart */}
                {dailyCalories && (
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-bold mb-4 text-center text-gray-800">Calorie Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={[
                        { name: 'Breakfast', cals: parseInt(analysis.mealBreakdown.breakfast.calories) || 0 },
                        { name: 'Lunch', cals: parseInt(analysis.mealBreakdown.lunch.calories) || 0 },
                        { name: 'Dinner', cals: parseInt(analysis.mealBreakdown.dinner.calories) || 0 },
                        { name: 'Snacks', cals: parseInt(analysis.mealBreakdown.snacks.calories) || 0 }
                      ]}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Bar dataKey="cals" radius={[8, 8, 0, 0]}>
                          {[
                            { name: 'Breakfast', cals: parseInt(analysis.mealBreakdown.breakfast.calories) || 0 },
                            { name: 'Lunch', cals: parseInt(analysis.mealBreakdown.lunch.calories) || 0 },
                            { name: 'Dinner', cals: parseInt(analysis.mealBreakdown.dinner.calories) || 0 },
                            { name: 'Snacks', cals: parseInt(analysis.mealBreakdown.snacks.calories) || 0 }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="#6b7b5e" />
                          ))}
                          <LabelList 
                            dataKey="cals" 
                            position="top" 
                            formatter={(value) => {
                              const total = parseInt(analysis.dailySummary.calories);
                              const percent = Math.round((value / total) * 100);
                              return `${percent}%`;
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-center text-sm text-gray-600 mt-2">
                      Total: {analysis.dailySummary.calories} / {dailyCalories} calories
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {Object.entries(analysis.mealBreakdown).map(([name, data]) => (
                    <div key={name} className="bg-white border-2 rounded-lg p-5" style={{borderColor: getRatingColor(data.rating)}}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-xl font-bold capitalize">{name}</h3>
                          {data.calories && (
                            <p className="text-sm text-gray-600">
                              {data.calories} calories
                              {dailyCalories && ` (${Math.round((parseInt(data.calories) / parseInt(analysis.dailySummary.calories)) * 100)}% of day)`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getRatingEmoji(data.rating)}</span>
                          <span className="text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap" style={{backgroundColor: `${getRatingColor(data.rating)}20`, color: getRatingColor(data.rating)}}>
                            {data.rating}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3 italic">{data.description}</p>
                      {data.portions && (
                        <div className="bg-emerald-50 border-l-4 p-3 rounded mb-3" style={{borderColor: '#6b7b5e'}}>
                          <p className="text-sm font-semibold mb-1" style={{color: '#6b7b5e'}}>Weigh out:</p>
                          <p className="text-sm">{data.portions}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-5 gap-2 text-sm mb-3">
                        <div><span className="text-gray-600">Protein:</span> <span className="font-semibold">{data.estimated.protein}</span></div>
                        <div><span className="text-gray-600">Carbs:</span> <span className="font-semibold">{data.estimated.carbs}</span></div>
                        <div><span className="text-gray-600">Fats:</span> <span className="font-semibold">{data.estimated.fats}</span></div>
                        <div><span className="text-gray-600">Veggies:</span> <span className="font-semibold">{data.estimated.veggies}</span></div>
                        <div><span className="text-gray-600">Fruit:</span> <span className="font-semibold">{data.estimated.fruit}</span></div>
                      </div>
                      {data.missing && (
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded mb-2">
                          <p className="text-sm text-amber-800"><strong>Missing:</strong> {data.missing}</p>
                        </div>
                      )}
                      {data.quickFix && (
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded">
                          <p className="text-sm text-amber-800"><strong>Quick fix:</strong> {data.quickFix}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-6" style={{backgroundColor: '#f9f7f4', borderColor: '#c9a96e'}}>
                <h2 className="text-2xl font-bold mb-4" style={{color: '#6b5d4f'}}>✨ Action Plan</h2>
                <ul className="space-y-2">
                  {analysis.actionableTakeaways.map((item, i) => (
                    <li key={i} className="flex gap-2" style={{color: '#6b5d4f'}}>
                      <span style={{color: '#c9a96e'}}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button onClick={() => { setBreakfast(''); setLunch(''); setDinner(''); setSnacks(''); setAnalysis(null); }} className="w-full bg-white border-2 py-3 rounded-lg font-semibold" style={{borderColor: '#6b7b5e', color: '#6b7b5e'}}>
                Plan Another Day
              </button>
            </div>
          )}

          {!analysis && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">How It Works</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>1. Set your daily targets</p>
                <p>2. Enter what you're planning for each meal</p>
                <p>3. Get a complete breakdown with specific adjustments</p>
                <p className="mt-4 pt-4 border-t"><strong>Pro tip:</strong> Be specific! "2 eggs with toast" is better than "eggs"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SZNDailyPlanner;

# Quick Fix: Weight & Dimensions Section

## The Problem
Weight and dimension fields are not showing in your AWB modal.

## The Solution
Make sure this section is placed **AFTER Product Details** and **BEFORE Contract Selection**:

```jsx
{/* ⭐ WEIGHT & DIMENSIONS SECTION - ADD THIS ⭐ */}
<div style={styles.section}>
  <h3>📦 Package Weight & Dimensions</h3>
  
  {/* WEIGHT */}
  <div style={styles.field}>
    <div style={styles.weightHeader}>
      <label><strong>Weight (grams) *</strong></label>
      <label style={styles.toggleLabel}>
        <input
          type="checkbox"
          checked={useManualWeight}
          onChange={(e) => {
            setUseManualWeight(e.target.checked);
            if (!e.target.checked) setManualWeight('');
          }}
        />
        {' '}Use Custom Weight
      </label>
    </div>

    {!useManualWeight ? (
      <div style={styles.weightDisplay}>
        <p style={styles.defaultWeightValue}>{defaultWeight}g</p>
        <small>📌 Default product weight</small>
      </div>
    ) : (
      <input
        type="number"
        min="1"
        max="35000"
        value={manualWeight}
        onChange={(e) => setManualWeight(e.target.value)}
        placeholder="Enter custom weight in grams"
        style={{...styles.input, border: '2px solid #2196F3'}}
      />
    )}
    
    {errors.weight && <span style={styles.error}>{errors.weight}</span>}
    <small style={{display: 'block', marginTop: '5px'}}>Max 35,000 grams</small>
  </div>

  {/* DIMENSIONS */}
  <div style={{marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee'}}>
    <h4>Dimensions *</h4>
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px'}}>
      
      {/* LENGTH */}
      <div style={{marginBottom: '15px'}}>
        <label><strong>Length (cm)</strong></label>
        <input
          type="number"
          min="1"
          max="300"
          step="0.1"
          value={length}
          onChange={(e) => setLength(e.target.value)}
          placeholder="e.g., 30"
          style={{
            width: '100%',
            padding: '8px',
            border: '2px solid #2196F3',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
        {errors.length && <span style={{color: '#c62828', fontSize: '12px'}}>{errors.length}</span>}
      </div>

      {/* WIDTH */}
      <div style={{marginBottom: '15px'}}>
        <label><strong>Width (cm)</strong></label>
        <input
          type="number"
          min="1"
          max="300"
          step="0.1"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          placeholder="e.g., 20"
          style={{
            width: '100%',
            padding: '8px',
            border: '2px solid #2196F3',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
        {errors.width && <span style={{color: '#c62828', fontSize: '12px'}}>{errors.width}</span>}
      </div>

      {/* HEIGHT */}
      <div style={{marginBottom: '15px'}}>
        <label><strong>Height (cm)</strong></label>
        <input
          type="number"
          min="1"
          max="300"
          step="0.1"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          placeholder="e.g., 10"
          style={{
            width: '100%',
            padding: '8px',
            border: '2px solid #2196F3',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
        {errors.height && <span style={{color: '#c62828', fontSize: '12px'}}>{errors.height}</span>}
      </div>
    </div>
  </div>

  {/* VOLUMETRIC WEIGHT INFO */}
  {length && width && height && (
    <div style={{
      backgroundColor: '#e3f2fd',
      padding: '12px',
      borderRadius: '4px',
      borderLeft: '4px solid #2196F3',
      marginTop: '15px'
    }}>
      <strong>📊 Volumetric Weight:</strong><br />
      ({length} × {width} × {height}) ÷ 5000 = <strong>{(length * width * height / 5000).toFixed(2)} kg</strong>
      <br />
      <small>💡 Charged = max(actual, volumetric)</small>
    </div>
  )}
</div>
```

## Modal Structure - Correct Order
```
1. Header (Generate AWB)
2. Order & Shipment Details
3. Product Details
4. ⭐ WEIGHT & DIMENSIONS ⭐ (THIS WAS MISSING!)
5. Return Address (if applicable)
6. Payment Method
7. Contract ID Selection
8. Error Messages
9. Cancel / Generate AWB Buttons
```

## State Variables Required

Add these to your component's `useState`:

```javascript
const defaultWeight = order.weight || 0;
const [useManualWeight, setUseManualWeight] = useState(false);
const [manualWeight, setManualWeight] = useState('');
const [length, setLength] = useState('');
const [width, setWidth] = useState('');
const [height, setHeight] = useState('');
const [errors, setErrors] = useState({});

// Calculate effective weight for submission
const weight = useManualWeight ? manualWeight : defaultWeight;
```

## CSS Key Properties

Make the inputs **ALWAYS visible and editable**:

```javascript
const inputStyle = {
  width: '100%',
  padding: '8px',
  border: '2px solid #2196F3',  // ← Blue border = clearly visible
  borderRadius: '4px',
  fontSize: '14px',
  boxSizing: 'border-box',
  backgroundColor: '#fff'        // ← White background = visible
};
```

## Checklist

- [ ] Weight/dimensions section is **BEFORE** Contract Selection
- [ ] Input fields have **blue borders** (2px solid #2196F3)
- [ ] Inputs have **white background**
- [ ] All 4 inputs render: Weight, Length, Width, Height
- [ ] Toggle switch works for manual weight
- [ ] Can type in all dimension fields
- [ ] Modal is scrollable (max-height: 90vh)
- [ ] Test by scrolling down to find all fields

## Still Not Showing?

**Debug steps:**
1. Check browser console for JS errors
2. Add `console.log('Rendering modal', { length, width, height, weight })`
3. Check modal height: add `border: '1px solid red'` to section temporarily
4. Verify modal component is receiving `order` prop correctly


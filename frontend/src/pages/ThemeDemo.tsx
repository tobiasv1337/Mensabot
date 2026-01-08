import { useTheme } from '../theme/themeProvider'
import styled from 'styled-components'

const DemoContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.surfacePage};
  color: ${props => props.theme.textOnPage};
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
`

const Header = styled.div`
  margin-bottom: 3rem;
`

const Title = styled.h1`
  color: ${props => props.theme.textOnPage};
  margin-bottom: 1rem;
`

const ThemeSwitcher = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
`

const ThemeButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  background: ${props => props.$active ? props.theme.surfaceAccent : props.theme.surfaceCard};
  color: ${props => props.$active ? props.theme.textOnAccent : props.theme.textOnCard};
  border: 2px solid ${props => props.$active ? props.theme.accent1 : 'transparent'};
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: ${props => props.$active ? 'bold' : 'normal'};
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
  }
`

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`

const ColorSection = styled.div`
  background: ${props => props.theme.surfaceCard};
  color: ${props => props.theme.textOnCard};
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`

const SectionTitle = styled.h2`
  color: ${props => props.theme.textOnCard};
  margin-bottom: 1rem;
  font-size: 1.25rem;
`

const ColorSwatch = styled.div<{ $color: string }>`
  background: ${props => props.$color};
  height: 80px;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.textOnCard};
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 0, 0, 0.1);
`

const ColorLabel = styled.div`
  display: flex;
  justify-content: space-between;
  color: ${props => props.theme.textSecondary};
  font-size: 0.875rem;
  margin-bottom: 1rem;
`

const ColorName = styled.span`
  font-weight: 600;
`

const ColorValue = styled.span`
  font-family: 'Monaco', 'Courier New', monospace;
`

const ExampleSection = styled.div`
  margin-top: 3rem;
`

const ExampleCard = styled.div`
  background: ${props => props.theme.surfaceCard};
  color: ${props => props.theme.textOnCard};
  padding: 2rem;
  border-radius: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`

const ExampleInset = styled.div`
  background: ${props => props.theme.surfaceInset};
  color: ${props => props.theme.textOnInset};
  padding: 1.5rem;
  border-radius: 0.5rem;
  margin-top: 1rem;
`

const AccentBox = styled.div`
  background: ${props => props.theme.surfaceAccent};
  color: ${props => props.theme.textOnAccent};
  padding: 1rem;
  border-radius: 0.5rem;
  margin-top: 1rem;
`

export default function ThemeDemo() {
  const { currentTheme, mode, toggleMode } = useTheme()

  const surfaceColors = [
    { name: 'surfacePage', value: currentTheme.surfacePage, textColor: currentTheme.textOnPage, description: 'Main page background' },
    { name: 'surfaceCard', value: currentTheme.surfaceCard, textColor: currentTheme.textOnCard, description: 'Cards & panels' },
    { name: 'surfaceInset', value: currentTheme.surfaceInset, textColor: currentTheme.textOnInset, description: 'Inputs & wells' },
    { name: 'surfaceElevated', value: currentTheme.surfaceElevated, textColor: currentTheme.textOnElevated, description: 'Modals & dropdowns' },
    { name: 'surfaceAccent', value: currentTheme.surfaceAccent, textColor: currentTheme.textOnAccent, description: 'Accent surface' },
  ]

  const textColors = [
    { name: 'textPrimary', value: currentTheme.textPrimary, description: 'Primary text (= textOnPage)' },
    { name: 'textSecondary', value: currentTheme.textSecondary, description: 'Dimmed text' },
    { name: 'textMuted', value: currentTheme.textMuted, description: 'More dimmed text' },
    { name: 'textLight', value: currentTheme.textLight, description: 'Light text utility' },
    { name: 'textDark', value: currentTheme.textDark, description: 'Dark text utility' },
    { name: 'textAccentGradient', value: currentTheme.textAccentGradient, description: 'Accent gradient' },
  ]

  const accentColors = [
    { name: 'accent1', value: currentTheme.accent1, textColor: currentTheme.textOnAccent1, description: 'Primary Accent' },
    { name: 'accent2', value: currentTheme.accent2, textColor: currentTheme.textOnAccent2, description: 'Secondary Accent' },
    { name: 'accent3', value: currentTheme.accent3, textColor: currentTheme.textOnAccent3, description: 'Tertiary Accent' },
  ]

  return (
    <DemoContainer>
      <Header>
        <Title>Theme Color Demo</Title>
        <ThemeSwitcher>
          <ThemeButton 
            $active={mode === 'light'} 
            onClick={() => toggleMode('light')}
          >
            ☀️ Light
          </ThemeButton>
          <ThemeButton 
            $active={mode === 'system'} 
            onClick={() => toggleMode('system')}
          >
            💻 System
          </ThemeButton>
          <ThemeButton 
            $active={mode === 'dark'} 
            onClick={() => toggleMode('dark')}
          >
            🌙 Dark
          </ThemeButton>
        </ThemeSwitcher>
      </Header>

      <ColorGrid>
        <ColorSection>
          <SectionTitle>Surface Colors</SectionTitle>
          {surfaceColors.map(color => (
            <div key={color.name}>
              <ColorSwatch $color={color.value}>
                <span style={{ color: color.textColor }}>{color.description}</span>
              </ColorSwatch>
              <ColorLabel>
                <ColorName>{color.name}</ColorName>
                <ColorValue>{color.value}</ColorValue>
              </ColorLabel>
              <ColorLabel>
                <ColorName>→ {color.name.replace('surface', 'textOn')}</ColorName>
                <ColorValue>{color.textColor}</ColorValue>
              </ColorLabel>
            </div>
          ))}
        </ColorSection>

        <ColorSection>
          <SectionTitle>Text Colors</SectionTitle>
          {textColors.map(color => (
            <div key={color.name}>
              <ColorSwatch $color={color.name.includes('Light') ? currentTheme.textDark : currentTheme.textLight}>
                <span style={{ color: color.value }}>{color.description}</span>
              </ColorSwatch>
              <ColorLabel>
                <ColorName>{color.name}</ColorName>
                <ColorValue>{color.value}</ColorValue>
              </ColorLabel>
            </div>
          ))}
        </ColorSection>

        <ColorSection>
          <SectionTitle>Accent Colors</SectionTitle>
          {accentColors.map(color => (
            <div key={color.name}>
              <ColorSwatch $color={color.value}>
                <span style={{ color: color.textColor }}>{color.description}</span>
              </ColorSwatch>
              <ColorLabel>
                <ColorName>{color.name}</ColorName>
                <ColorValue>{color.value}</ColorValue>
              </ColorLabel>
              <ColorLabel>
                <ColorName>→ {color.name.replace('accent', 'textOnAccent')}</ColorName>
                <ColorValue>{color.textColor}</ColorValue>
              </ColorLabel>
            </div>
          ))}
        </ColorSection>
      </ColorGrid>

      <ExampleSection>
        <SectionTitle>Usage Examples - All Surfaces in Context</SectionTitle>
        
        <div style={{ 
          padding: '1rem', 
          background: currentTheme.surfacePage, 
          color: currentTheme.textOnPage,
          border: `2px dashed ${currentTheme.textMuted}`,
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}>
          <small style={{ color: currentTheme.textMuted }}>surfacePage (you're looking at it!)</small>
          <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>This is the main page background. Everything sits on this surface.</p>
        </div>

        <ExampleCard>
          <h3>surfaceCard - Card / Panel</h3>
          <p>
            Cards are raised surfaces that contain related content. They sit on the page surface and provide visual hierarchy.
          </p>
          
          <ExampleInset>
            <strong>surfaceInset - Input Field / Well</strong>
            <p style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              Inset surfaces are recessed areas, perfect for form inputs, text areas, or content wells.
            </p>
            <input 
              type="text" 
              placeholder="Example input field..."
              style={{
                width: '100%',
                padding: '0.5rem',
                background: currentTheme.surfaceInset,
                color: currentTheme.textOnInset,
                border: `1px solid ${currentTheme.textMuted}`,
                borderRadius: '0.25rem',
                fontFamily: 'inherit'
              }}
            />
          </ExampleInset>

          <AccentBox>
            <strong>surfaceAccent - Accent Highlight</strong>
            <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              Accent surfaces draw attention to important information or actions.
            </p>
          </AccentBox>
        </ExampleCard>

        <ExampleCard>
          <h3>Form Example - Nested Surfaces</h3>
          <p>A realistic form with multiple surface types:</p>

          <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', color: currentTheme.textSecondary, fontSize: '0.875rem' }}>
                Username
              </label>
              <ExampleInset>
                <input 
                  type="text" 
                  placeholder="Enter username..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'transparent',
                    color: currentTheme.textOnInset,
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </ExampleInset>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', color: currentTheme.textSecondary, fontSize: '0.875rem' }}>
                Message
              </label>
              <ExampleInset>
                <textarea 
                  placeholder="Type your message..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'transparent',
                    color: currentTheme.textOnInset,
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </ExampleInset>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button style={{ 
                background: currentTheme.accent1, 
                color: currentTheme.textOnAccent1,
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}>
                Submit (accent1)
              </button>
              <button style={{ 
                background: currentTheme.surfaceInset, 
                color: currentTheme.textOnInset,
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}>
                Cancel (surfaceInset)
              </button>
            </div>
          </div>
        </ExampleCard>

        <div style={{ 
          position: 'relative',
          minHeight: '200px',
          marginTop: '1rem'
        }}>
          <ExampleCard>
            <h3>surfaceElevated - Modal / Dropdown</h3>
            <p>Click to see elevated surface example:</p>
            
            <div style={{
              position: 'relative',
              marginTop: '1rem'
            }}>
              <button style={{ 
                background: currentTheme.accent2, 
                color: currentTheme.textOnAccent2,
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}>
                Open Dropdown
              </button>
              
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '0.5rem',
                background: currentTheme.surfaceElevated,
                color: currentTheme.textOnElevated,
                padding: '1rem',
                borderRadius: '0.5rem',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
                minWidth: '200px',
                zIndex: 10
              }}>
                <strong>surfaceElevated</strong>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
                  This simulates a dropdown or modal. It has the highest visual elevation.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <button style={{ 
                    background: 'transparent', 
                    color: currentTheme.textOnElevated,
                    padding: '0.25rem 0.5rem',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}>
                    Option 1
                  </button>
                  <button style={{ 
                    background: 'transparent', 
                    color: currentTheme.textOnElevated,
                    padding: '0.25rem 0.5rem',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}>
                    Option 2
                  </button>
                  <button style={{ 
                    background: 'transparent', 
                    color: currentTheme.textOnElevated,
                    padding: '0.25rem 0.5rem',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}>
                    Option 3
                  </button>
                </div>
              </div>
            </div>
          </ExampleCard>
        </div>

        <ExampleCard>
          <h3>Text Hierarchy</h3>
          <p style={{ color: currentTheme.textPrimary, marginBottom: '0.5rem' }}>
            <strong>textPrimary</strong> - Main content text for primary information
          </p>
          <p style={{ color: currentTheme.textSecondary, marginBottom: '0.5rem' }}>
            <strong>textSecondary</strong> - Slightly dimmed for supporting information, timestamps, labels
          </p>
          <p style={{ color: currentTheme.textMuted, marginBottom: '0.5rem' }}>
            <strong>textMuted</strong> - Even more dimmed for hints, placeholders, or less important details
          </p>
        </ExampleCard>

        <ExampleCard>
          <h3>All Accent Colors</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <button style={{ 
              background: currentTheme.accent1, 
              color: currentTheme.textOnAccent1,
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              flex: '1 1 150px'
            }}>
              Accent 1
            </button>
            <button style={{ 
              background: currentTheme.accent2, 
              color: currentTheme.textOnAccent2,
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              flex: '1 1 150px'
            }}>
              Accent 2
            </button>
            <button style={{ 
              background: currentTheme.accent3, 
              color: currentTheme.textOnAccent3,
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              flex: '1 1 150px'
            }}>
              Accent 3
            </button>
          </div>
        </ExampleCard>
      </ExampleSection>
    </DemoContainer>
  )
}

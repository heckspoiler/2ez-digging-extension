import './App.css';

function App() {
  const onclick = async () => {
    const [tab] = await chrome.tabs.query({ active: true });
    chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => {
        document.body.style.backgroundColor = 'red';
      },
    });
  };

  return (
    <main id="root">
      <div id="main">
        <section id="center">
          <form className="signup-form">
            <div className="inputgroup">
              <input placeholder="email" type="email" />
            </div>
            <div className="inputgroup">
              <input placeholder="password" type="password" />
            </div>
          </form>

          <img
            src="/icon32.png"
            alt="Logo"
            height={100}
            width={100}
            onClick={onclick}
          />
        </section>
      </div>
    </main>
  );
}

export default App;

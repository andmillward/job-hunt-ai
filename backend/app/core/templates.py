GREASEMONKEY_SCRIPT_TEMPLATE = """// ==UserScript==
// @name         JobHunt AI - Auto-Fill ({platform_cap})
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Intelligent auto-fill for job applications using your JobHunt AI persona.
// @author       JobHunt AI
{match_str}
// @grant        none
// ==UserScript==

(function() {{
    'use strict';

    const USER_DATA = {user_data_json};

    console.log(">>> JobHunt AI: Automation Script Active");

    // Helper to find and fill fields
    function fillField(keywords, value) {{
        if (!value) return;
        const inputs = document.querySelectorAll('input, textarea, select');
        for (const input of inputs) {{
            const label = input.getAttribute('aria-label') || '';
            const name = input.getAttribute('name') || '';
            const placeholder = input.getAttribute('placeholder') || '';
            const id = input.id || '';
            
            const combined = (label + " " + name + " " + placeholder + " " + id).toLowerCase();
            
            if (keywords.some(k => combined.includes(k.toLowerCase()))) {{
                if (input.tagName === 'SELECT') {{
                    // Selection logic could be complex, just log for now
                    console.log(">>> JobHunt AI: Found select for", keywords);
                }} else if (!input.value) {{
                    input.value = value;
                    input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    console.log(">>> JobHunt AI: Filled", keywords);
                }}
            }}
        }}
    }}

    // UI Overlay for triggering fill
    const btn = document.createElement('button');
    btn.innerHTML = '⚡ Fill with JobHunt AI';
    btn.style.position = 'fixed';
    btn.style.top = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '99999';
    btn.style.padding = '12px 20px';
    btn.style.backgroundColor = '#4f46e5';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '12px';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
    
    btn.onclick = () => {{
        fillField(['skill', 'technical'], USER_DATA.skills);
        fillField(['experience', 'summary', 'describe'], USER_DATA.experience);
        fillField(['education'], USER_DATA.education);
        alert("JobHunt AI persona data injected.");
    }};

    document.body.appendChild(btn);

}})();
"""

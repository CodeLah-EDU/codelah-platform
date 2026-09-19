import {test,expect} from '@playwright/test';
test('signed-out dashboard routes to login and renders both account forms',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/dashboard');await expect(page).toHaveURL(/\/login$/);
 await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Student sign in',exact:true})).toBeEnabled();
 await expect(page.getByRole('button',{name:'Parent / teacher sign in',exact:true})).toBeEnabled();
 await page.getByText('First time here? Create an adult account').click();
 await expect(page.getByRole('button',{name:'Create account',exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});
test('invalid credentials receive generic feedback without granting access',async({page})=>{
 await page.goto('/login');
 const form=page.locator('form').filter({has:page.getByRole('button',{name:'Student sign in',exact:true})});
 await form.getByLabel('Username',{exact:true}).fill('unassigned_test');
 await form.getByLabel('Password',{exact:true}).fill('not-a-real-password-123');
 await form.getByRole('button').click();
 await expect(page).toHaveURL(/message=invalid/);
 await expect(page.getByText('We could not sign you in.',{exact:false})).toBeVisible();
});
test('cross-origin mutation is rejected before any account change',async({request})=>{
 const response=await request.post('/dashboard/manage',{headers:{origin:'https://unrelated.example'},form:{action:'classroom',name:'Should not exist'},maxRedirects:0});
 expect(response.status()).toBe(403);
});
test('small screens retain accessible sign-in controls and no horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/login');
 await expect(page.getByRole('button',{name:'Student sign in',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();
 await page.screenshot({path:'test-results/login-mobile.png',fullPage:true,caret:'initial'});
});

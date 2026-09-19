import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

// Called by CodeLah's server with the user's JWT. The gateway also verifies JWTs.
// Service credentials are supplied by Supabase, never by the web app or caller.
Deno.serve(async (request: Request) => {
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  if(request.method!=='POST')return reply({error:'Method not allowed'},405);
  if(Number(request.headers.get('content-length')??0)>4096)return reply({error:'Request too large'},413);
  const url=Deno.env.get('SUPABASE_URL')!;
  const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
  const authorization=request.headers.get('authorization')??'';
  const client=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return reply({error:'Sign in required'},401);
    const {data:actor,error:actorError}=await client.from('accounts').select('role,status').eq('id',user.id).single();
    if(actorError||actor?.status!=='active'||!['admin','parent','teacher'].includes(actor.role))return reply({error:'Access denied'},403);
    const raw=await request.text();if(raw.length>4096)return reply({error:'Request too large'},413);
    const body=JSON.parse(raw);
    const password=body.password;
    if(typeof password!=='string'||password.length<12||password.length>128)return reply({error:'Use a password with 12–128 characters.'},400);
    const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    if(body.action==='reset_password') {
      if(typeof body.student_id!=='string')return reply({error:'Invalid student'},400);
      const {data:allowed,error}=await client.rpc('can_manage_student',{target:body.student_id});
      if(error||!allowed)return reply({error:'Access denied'},403);
      const {error:updateError}=await admin.auth.admin.updateUserById(body.student_id,{password});
      if(updateError)return reply({error:'Password could not be changed. Please try again.'},400);
      return reply({ok:true});
    }
    if(body.action==='create_student') {
      if(actor.role!=='admin')return reply({error:'Access denied'},403);
      const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
      const name=typeof body.display_name==='string'?body.display_name.trim():'';
      if(!/^[a-z][a-z0-9_]{3,23}$/.test(username)||name.length<1||name.length>100)return reply({error:'Check the student name and username.'},400);
      const {data:created,error:createError}=await admin.auth.admin.createUser({email:`${username}@students.codelah.invalid`,password,email_confirm:true});
      if(createError||!created.user)return reply({error:'Student could not be created. Try another username.'},400);
      const studentId=created.user.id;
      const {error:profileError}=await admin.from('accounts').update({role:'student',status:'active',display_name:name}).eq('id',studentId);
      const {error:usernameError}=profileError?{error:profileError}:await admin.from('student_usernames').insert({student_id:studentId,username});
      if(profileError||usernameError) {
        // Compensate only the identity created by this request, never an existing user.
        await admin.auth.admin.deleteUser(studentId);
        return reply({error:'Student setup failed. Please try again.'},500);
      }
      return reply({ok:true,student_id:studentId});
    }
    return reply({error:'Unknown action'},400);
  } catch { return reply({error:'Request could not be completed.'},400); }
});

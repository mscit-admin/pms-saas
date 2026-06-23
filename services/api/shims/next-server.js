// بديل خفيف لـ 'next/server' — يكفي ما تستخدمه المعالجات:
//   NextResponse.json(data, init)  ولِبناء ردود ثنائية: new NextResponse(body, init)
// مبنيّ فوق Web Response القياسي، فلا اعتماد على Next.js في خدمة الـ API.

export class NextResponse extends Response {
  static json(data, init) {
    return Response.json(data, init);
  }
  static redirect(url, status = 307) {
    return Response.redirect(url, status);
  }
  static next() {
    return new NextResponse(null, { status: 200 });
  }
}

export default NextResponse;

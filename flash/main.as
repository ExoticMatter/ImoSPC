package
{
	import flash.display.Sprite;
	import flash.errors.*;
	import flash.events.*;
	import flash.external.ExternalInterface;
	import flash.net.URLRequest;
	import flash.net.URLStream;
	import flash.system.Security;
	import flash.utils.ByteArray;

	import ImoSPC.*;

	public class main extends Sprite {
		private var spc:SPC;
		private var loader:Loader;
		
		public function main() {
			Security.allowDomain("*");
			
			spc = new SPC();
			loader = new Loader(spc);
			ExternalInterface.call("ImoSPC._ready");
		}
	}
}
